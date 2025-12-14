"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Scene from "~/app/_components/scene";
import { io, type Socket } from "socket.io-client";
import { useSession } from "~/providers/session-provider";
import { Cursor } from "~/components/UserCursor";
import { type ExtendedSessionUser } from "~/types/auth";
import { useLoadOperations } from "~/app/(protected)/hooks/use-load-operations";
import { useAutoSave } from "~/app/(protected)/hooks/use-auto-save";
import { MigrateDialog, useMigrationCheck } from "./_components/migrate-dialog";

interface CursorData {
  position: { x: number; y: number };
  name: string;
}

type UserCursors = Record<string, CursorData>;

function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 85%, 60%)`;
}

export default function DocumentPage() {
  const params = useParams();
  const { session } = useSession();
  const user = session?.user as ExtendedSessionUser | undefined;
  const documentId = params.documentId as string;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [cursors, setCursors] = useState<UserCursors>({});
  const [myColor] = useState(generateRandomColor()); // Generate once when component mounts

  // Load operations from database
  const { isLoading: loadingOps } = useLoadOperations(documentId);

  // Auto-save pending operations
  const { isSaving, hasPendingChanges } = useAutoSave(documentId);

  // Check if migration dialog should be shown
  const { showMigrationDialog, closeMigrationDialog } = useMigrationCheck(documentId);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!documentId) return;

    const socketInstance = io();
    setSocket(socketInstance);
    
    // Join document room
    socketInstance.emit("joinDocument", {
      documentId,
      userId: user?.id,
      name: user?.name,
    });

    // Handle cursor updates from other users
    socketInstance.on("cursor:update", ({ userId, position, name }: { 
      userId: string; 
      position: { x: number; y: number }; 
      name: string; 
    }) => {
      
      setCursors(prev => {
        const newCursors = {
          ...prev,
          [userId]: { position, name }
        };
        return newCursors;
      });
    });

    // Handle user leaving
    socketInstance.on("userLeft", ({ userId }: { userId: string }) => {
      setCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[userId];
        return newCursors;
      });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [documentId, user?.id, user?.name]);

  // Update cursor move handler to include username
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!socket) return;

    const position = {
      x: e.clientX,
      y: e.clientY,
    };

    socket.emit("cursorMove", {
      documentId,
      userId: user?.id,
      position,
      name: user?.name ?? 'Unknown',
    });
  };

  console.log('[DocumentPage] Rendering DocumentPage, documentId:', documentId)

  return (
    <div
      className="flex w-full h-full relative"
      onMouseMove={handleMouseMove}
    >
      <Scene />

      {/* User cursors */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {Object.entries(cursors).map(([userId, { position, name }]) => (
          <Cursor
            key={userId}
            position={position}
            name={name}
            color={myColor}
          />
        ))}
      </div>

      {/* Auto-save indicator */}
      {(isSaving || hasPendingChanges) && (
        <div className="fixed top-4 right-4 z-40 bg-white dark:bg-gray-800 px-3 py-2 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            {isSaving ? (
              <>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-gray-700 dark:text-gray-300">Saving...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span className="text-gray-700 dark:text-gray-300">Unsaved changes</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Migration dialog */}
      {showMigrationDialog && (
        <MigrateDialog documentId={documentId} onClose={closeMigrationDialog} />
      )}
    </div>
  );
}