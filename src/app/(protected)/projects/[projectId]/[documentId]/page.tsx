"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Scene from "~/app/_components/scene";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { Cursor } from "~/components/UserCursor";
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
  const session = useSession();
  const user = session.data?.user;
  const documentId = params.documentId as string;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [cursors, setCursors] = useState<UserCursors>({});
  const [myColor] = useState(generateRandomColor()); // Generate once when component mounts

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
      setCursors(prev => ({
        ...prev,
        [userId]: { position, name }
      }));
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

  useEffect(() => {
    console.log("Current cursors state:", cursors);
  }, [cursors]);

  return (
    <div 
      className="flex w-full h-full relative" 
      onMouseMove={handleMouseMove}
    >
      <Scene />
      
      {/* Debug info */}
      <div className="fixed top-0 right-0 bg-black/50 text-white p-2 z-50">
        Active cursors: {Object.keys(cursors).length}
      </div>

      {/* Cursor layer */}
      <div className="fixed inset-0 z-50">
        {Object.entries(cursors).map(([userId, { position, name }]) => (
          <Cursor
            key={userId}
            position={position}
            name={name}
            color={myColor} // Just use the one color we generated
          />
        ))}
      </div>
    </div>
  );
}