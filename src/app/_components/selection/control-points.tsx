"use client";

import { useParams } from "next/navigation";
import { useAtomValue } from "jotai";
import { documentSketchesFromOperationsAtom } from "~/app/(protected)/atoms/operations-atoms";
import { documentSelectionAtom } from "~/app/(protected)/atoms/selection-atoms";
import { useMemo } from "react";
import type { Point3D } from "~/app/(protected)/atoms";

const CONTROL_POINT_RADIUS = 1.5;
const CONTROL_POINT_COLOR = "#ffffff";
const SELECTED_CONTROL_POINT_COLOR = "#ffff00";
const HOVERED_CONTROL_POINT_COLOR = "#00ffff";

export default function ControlPoints() {
  const params = useParams();
  const documentId = params.documentId as string;
  const sketches = useAtomValue(documentSketchesFromOperationsAtom(documentId));
  const selectionState = useAtomValue(documentSelectionAtom(documentId));

  // Only collect points from SELECTED or HOVERED sketches (avoid visual clutter!)
  const relevantPoints = useMemo(() => {
    const points: Array<{ point: Point3D; id: string; parentId: string }> = [];

    // Get IDs of selected/hovered sketches
    const selectedSketchIds = new Set(
      selectionState.selectedElements
        .filter((el) => el.type === "sketch")
        .map((el) => el.id),
    );

    const hoveredSketchId =
      selectionState.hoveredElement?.type === "sketch"
        ? selectionState.hoveredElement.id
        : selectionState.hoveredElement?.parentId;

    if (hoveredSketchId) {
      selectedSketchIds.add(hoveredSketchId);
    }

    // Only render points for selected/hovered sketches
    for (const dimension of ["x", "y", "z"] as const) {
      for (const sketch of sketches[dimension]) {
        if (!selectedSketchIds.has(sketch.id)) continue;

        sketch.points.forEach((point, index) => {
          points.push({
            point,
            id: `${sketch.id}-point-${index}`,
            parentId: sketch.id,
          });
        });
      }
    }

    return points;
  }, [
    sketches,
    selectionState.selectedElements,
    selectionState.hoveredElement,
  ]);

  // Use instanced rendering for better performance when showing many points
  if (relevantPoints.length === 0) return null;

  return (
    <group>
      {relevantPoints.map(({ point, id, parentId }) => {
        const isSelected = selectionState.selectedElements.some(
          (el) => el.id === id,
        );
        const isParentSelected = selectionState.selectedElements.some(
          (el) => el.id === parentId,
        );
        const isHovered = selectionState.hoveredElement?.id === id;

        const color = isSelected
          ? SELECTED_CONTROL_POINT_COLOR
          : isHovered
            ? HOVERED_CONTROL_POINT_COLOR
            : isParentSelected
              ? SELECTED_CONTROL_POINT_COLOR
              : CONTROL_POINT_COLOR;

        const scale = isSelected || isHovered ? 1.3 : 1.0;

        return (
          <mesh key={id} position={[point.x, point.y, point.z]} scale={scale}>
            <sphereGeometry args={[CONTROL_POINT_RADIUS, 8, 8]} />
            <meshBasicMaterial color={color} depthTest={false} />
          </mesh>
        );
      })}
    </group>
  );
}
