import { Server as SocketServer } from "socket.io";
import { handleGameLogic } from "./gameLogic.js";

export const setupSocketServer = (server) => {
  const io = new SocketServer(server, {
    cors: {
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // socket.on("disconnect", () => {
    //   console.log("Client disconnected:", socket.id);
    // });

    handleGameLogic(socket, io);
  });
};