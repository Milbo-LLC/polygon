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
  type Dimension,
  type DocumentState,
  type DrawingItem,
  type ExtrudedShape,
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

const createStateSnapshot = (
  sketches: Record<Dimension, DrawingItem[]>,
  extrudedShapes: ExtrudedShape[],
): DocumentState => ({
  ...createEmptyDocumentState(),
  sketches: cloneSketches(sketches),
  extrudedShapes: cloneExtrudedShapes(extrudedShapes),
});

const serializeState = (state: DocumentState) =>
  JSON.stringify({
    sketches: state.sketches,
    extrudedShapes: state.extrudedShapes,
  });

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

  const lastAppliedState = useRef<string>("");
  const isApplyingExternalState = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const applyState = useCallback(
    (state: DocumentState) => {
      const nextSketches = cloneSketches(state.sketches);
      const nextExtrusions = cloneExtrudedShapes(state.extrudedShapes);

      const serialized = serializeState({
        ...createEmptyDocumentState(),
        sketches: nextSketches,
        extrudedShapes: nextExtrusions,
      });

      lastAppliedState.current = serialized;
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
    if (!socket) return;

    const handleHydration = ({ state }: { state: unknown }) => {
      try {
        const parsed = DocumentStateSchema.parse(state);
        applyState(parsed);
      } catch (error) {
        console.error("Failed to hydrate document state", error);
      }
    };

    socket.on("document:state:hydrated", handleHydration);

    const requestState = () => {
      socket.emit("document:state:request", { documentId });
    };

    if (socket.connected) {
      requestState();
    } else {
      socket.once("connect", requestState);
    }

    return () => {
      socket.off("document:state:hydrated", handleHydration);
      socket.off("connect", requestState);
    };
  }, [socket, applyState, documentId]);

  useEffect(() => {
    if (isApplyingExternalState.current) return;

    const stateToPersist = createStateSnapshot(sketches, extrudedShapes);
    const serialized = serializeState(stateToPersist);

    if (serialized === lastAppliedState.current) {
      return;
    }

    lastAppliedState.current = serialized;

    if (socket) {
      socket.emit("document:state:update", {
        documentId,
        state: stateToPersist,
      });
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      persistState({ id: documentId, state: stateToPersist });
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
