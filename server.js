// @ts-nocheck

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

const app = next({ dev });
const handler = app.getRequestHandler();

// Track connected users and their cursor positions
const documentUsers = new Map();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*", // Add CORS for production
      methods: ["GET", "POST"]
    }
  });

  // Debug: Log all connected users
  const connectedUsers = new Map();

  io.on("connection", (socket) => {
    // Handle joining a document room
    socket.on("joinDocument", ({ documentId, userId, name }) => {
      socket.join(documentId);

      // Initialize user in the document with their name
      if (!documentUsers.has(documentId)) {
        documentUsers.set(documentId, new Map());
      }
      documentUsers.get(documentId).set(userId, { position: { x: 0, y: 0 }, name });

      // Store user info with name
      connectedUsers.set(socket.id, { documentId, userId, name });

      // Broadcast to others that a new user joined (include name)
      socket.to(documentId).emit("userJoined", { userId, name });
    });

    // Handle cursor movement
    socket.on("cursorMove", ({ documentId, userId, position, name }) => {
      // Update stored position and name
      if (documentUsers.has(documentId)) {
        const userMap = documentUsers.get(documentId);
        if (userMap.has(userId)) {
          userMap.set(userId, { position, name });
        }
      }

      // Broadcast to others
      socket.to(documentId).emit("cursor:update", {
        userId,
        position,
        name
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      const userInfo = connectedUsers.get(socket.id);
      if (userInfo) {
        const { documentId, userId } = userInfo;
        // Clean up user data
        documentUsers.forEach((users, docId) => {
          users.forEach((_, uid) => {
            socket.to(docId).emit("userLeft", { userId: uid });
          });
        });
        connectedUsers.delete(socket.id);
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on port ${port}`);
    });
});