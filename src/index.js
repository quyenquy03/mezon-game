import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketServer } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "client", "room.html"));
});

const server = app.listen(3000, function () {
  console.log("Example app listening on port 3000 with domain http://localhost:3000");
});

const connectedUsers = [
  {
    id: "1234",
    userId: 1234,
    name: "User 1234",
    avatar: "https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg",
    socketId: "socket-1234",
  },
  {
    id: "5678",
    userId: 5678,
    name: "User 5678",
    avatar: "https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg",
    socketId: "socket-5678",
  },
];
const listRooms = [
  {
    roomId: "123456",
    roomName: "Phòng 1",
    roomMaxUser: 8,
    roomPassword: null,
    roomUsePassword: false,
    roomBet: 1000,
    owner: 1234, // ID của người chủ phòng
  },
  {
    roomId: "234567",
    roomName: "Phòng 1",
    roomMaxUser: 8,
    roomPassword: null,
    roomUsePassword: false,
    roomBet: 1000,
    owner: 1234, // ID của người chủ phòng
  },
  {
    roomId: "234567",
    roomName: "Phòng 1",
    roomMaxUser: 8,
    roomPassword: null,
    roomUsePassword: false,
    roomBet: 1000,
    owner: 1234, // ID của người chủ phòng
  },
  {
    roomId: "234567",
    roomName: "Phòng 1",
    roomMaxUser: 8,
    roomPassword: null,
    roomUsePassword: false,
    roomBet: 1000,
    owner: 1234, // ID của người chủ phòng
  },
];

const disconnectUser = (socket) => {
  const index = connectedUsers.findIndex((user) => user.id === socket.id);
  const user = connectedUsers[index];
  if (index !== -1) {
    connectedUsers.splice(index, 1); // Xóa khỏi mảng
  }
};

const createdRoom = (roomInfo) => {
  listRooms.push(roomInfo);
};
const setupSocketServer = (server) => {
  const io = new SocketServer(server, {
    cors: {
      // origin: [ENV.ORIGIN],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Nhận thông tin từ client
    socket.on("userInfo", (userInfo) => {
      connectedUsers.push({ id: socket.id, ...userInfo });
      io.emit("userInfo", userInfo);
      io.emit("listUsers", connectedUsers);
    });

    socket.on("listUsers", () => {
      io.emit("listUsers", connectedUsers);
    });

    // Tạo phòng mới
    socket.on("createRoom", (roomInfo) => {
      createdRoom(roomInfo);
      io.emit("roomCreated", roomInfo);
      io.emit("listRooms", listRooms);
    });

    socket.on("listRooms", () => {
      io.emit("listRooms", listRooms);
    });

    // Khi client ngắt kết nối
    socket.on("disconnect", () => {
      disconnectUser(socket);
    });
  });
};

setupSocketServer(server);
