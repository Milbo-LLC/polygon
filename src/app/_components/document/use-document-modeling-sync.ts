"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { type Socket } from "socket.io-client";

import {
  documentExtrudedShapesAtom,
  documentSketchesAtom,
} from "~/app/(protected)/atoms";
import { api } from "~/trpc/react";
import {
  DocumentStateSchema,
  emptyDocumentState,
} from "~/validators/documents";
import {
  createEmptyDocumentState,
  type DocumentState,
  type ExtrudedShape,
  type DrawingItem,
  type Dimension,
  type Point3D,
} from "~/types/modeling";

const SAVE_DEBOUNCE_MS = 500;

const clonePoint = (point: Point3D): Point3D => ({ ...point });

const cloneSketches = (
  sketches: Record<Dimension, DrawingItem[]>,
): Record<Dimension, DrawingItem[]> => ({
  x: sketches.x.map(sketch => ({
    ...sketch,
    points: sketch.points.map(clonePoint),
  })),
  y: sketches.y.map(sketch => ({
    ...sketch,
    points: sketch.points.map(clonePoint),
  })),
  z: sketches.z.map(sketch => ({
    ...sketch,
    points: sketch.points.map(clonePoint),
  })),
});

const cloneExtrudedShapes = (shapes: ExtrudedShape[]): ExtrudedShape[] =>
  shapes.map(shape => ({ ...shape }));

export function useDocumentModelingSync(documentId: string, socket: Socket | null) {
  const [sketches, setSketches] = useAtom(documentSketchesAtom(documentId));
  const [extrudedShapes, setExtrudedShapes] = useAtom(
    documentExtrudedShapesAtom(documentId),
  );

  const utils = api.useUtils();

  const {
    data: document,
    isLoading,
  } = api.document.get.useQuery(
    { id: documentId },
    {
      enabled: Boolean(documentId),
    },
  );

  const { mutate: persistState } = api.document.update.useMutation({
    onSuccess: updated => {
      utils.document.get.setData({ id: documentId }, updated);
    },
  });

  const lastSyncedState = useRef<string>("");
  const isApplyingExternalState = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const applyState = useCallback(
    (state: DocumentState) => {
      const nextSketches = cloneSketches(state.sketches);
      const nextExtrusions = cloneExtrudedShapes(state.extrudedShapes);

      const serialized = JSON.stringify({
        sketches: nextSketches,
        extrudedShapes: nextExtrusions,
      });

      lastSyncedState.current = serialized;
      isApplyingExternalState.current = true;
      setSketches(nextSketches);
      setExtrudedShapes(nextExtrusions);
      isApplyingExternalState.current = false;
    },
    [setSketches, setExtrudedShapes],
  );

  useEffect(() => {
    if (!document?.state) {
      if (!isLoading) {
        applyState(emptyDocumentState());
      }
      return;
    }

    const parsed = DocumentStateSchema.parse(document.state);
    applyState(parsed);
  }, [document?.state, applyState, isLoading]);

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = ({ state }: { state: unknown }) => {
      try {
        const parsed = DocumentStateSchema.parse(state);
        applyState(parsed);
      } catch (error) {
        console.error("Failed to apply remote document state", error);
      }
    };

    socket.on("document:state:updated", handleStateUpdate);

    return () => {
      socket.off("document:state:updated", handleStateUpdate);
    };
  }, [socket, applyState]);

  useEffect(() => {
    if (isApplyingExternalState.current) return;

    const currentState = {
      sketches,
      extrudedShapes,
    };

    const serialized = JSON.stringify(currentState);
    if (serialized === lastSyncedState.current) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      lastSyncedState.current = serialized;
      const stateToPersist: DocumentState = {
        ...createEmptyDocumentState(),
        sketches: cloneSketches(sketches),
        extrudedShapes: cloneExtrudedShapes(extrudedShapes),
      };

      persistState({ id: documentId, state: stateToPersist });
      socket?.emit("document:state:update", {
        documentId,
        state: stateToPersist,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [sketches, extrudedShapes, documentId, socket, persistState]);

  return {
    isLoading,
  };
}
