"use client";

import { GizmoHelper, GizmoViewcube, GizmoViewport } from "@react-three/drei";
import { useState } from "react";
import { useKeyboardShortcut } from "~/hooks/use-keyboard-shortcuts";

export default function Gizmo() {
  const [gizmoType, setGizmoType] = useState<'viewcube' | 'viewport'>('viewcube');

  useKeyboardShortcut([
    {
      key: 'g',
      metaKey: true,
      preventDefault: true,
      callback: () => setGizmoType(prev => prev === 'viewcube' ? 'viewport' : 'viewcube')
    }
  ]);

  return (
    <GizmoHelper alignment="top-right" margin={[60, 60]}>
      {gizmoType === 'viewcube' ? <GizmoViewcube /> : <GizmoViewport />}
    </GizmoHelper>
  );
}