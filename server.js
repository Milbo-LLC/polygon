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
// Track users in each organization
const organizationUsers = new Map();

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

    // Handle joining an organization room
    socket.on("join-org", ({ organizationId, userId, userName, userImage }) => {
      console.log(`User ${userName} (${userId}) joined organization ${organizationId}`);
      
      // Join the organization room
      socket.join(`org:${organizationId}`);
      
      // Track this socket's organization
      connectedUsers.set(socket.id, { 
        ...connectedUsers.get(socket.id), 
        organizationId, 
        userId 
      });
      
      // Add user to organization users list
      if (!organizationUsers.has(organizationId)) {
        organizationUsers.set(organizationId, new Map());
      }
      
      organizationUsers.get(organizationId).set(userId, {
        id: userId,
        name: userName,
        image: userImage,
        socketId: socket.id
      });
      
      // Send updated users list to all clients in this organization
      const usersArray = Array.from(organizationUsers.get(organizationId).values());
      io.to(`org:${organizationId}`).emit("users-update", usersArray);
    });
    
    // Handle leaving an organization
    socket.on("leave-org", ({ organizationId }) => {
      const userInfo = connectedUsers.get(socket.id);
      
      if (userInfo && userInfo.organizationId === organizationId) {
        handleUserLeavingOrg(socket, organizationId, userInfo.userId);
      }
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
        // Handle document disconnect
        const { documentId, userId, organizationId } = userInfo;
        
        if (documentId) {
          // Remove from document and notify others
          if (documentUsers.has(documentId)) {
            documentUsers.get(documentId).delete(userId);
            socket.to(documentId).emit("userLeft", { userId });
          }
        }
        
        // Handle organization disconnect
        if (organizationId) {
          handleUserLeavingOrg(socket, organizationId, userId);
        }
        
        connectedUsers.delete(socket.id);
      }
    });
    
    // Helper function for handling a user leaving an organization
    function handleUserLeavingOrg(socket, organizationId, userId) {
      if (organizationUsers.has(organizationId)) {
        // Remove user from the organization's user list
        organizationUsers.get(organizationId).delete(userId);
        
        // Leave the organization room
        socket.leave(`org:${organizationId}`);
        
        // Send updated user list to all remaining clients in this organization
        const usersArray = Array.from(organizationUsers.get(organizationId).values());
        io.to(`org:${organizationId}`).emit("users-update", usersArray);
      }
    }
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