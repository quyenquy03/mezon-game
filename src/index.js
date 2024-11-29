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
  res.sendFile(path.join(__dirname, "client", "home.html"));
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
    roomInfo: {
      roomId: "123456",
      roomName: "Phòng 1",
      roomMaxUser: 4,
      roomPassword: null,
      roomUsePassword: false,
      roomBet: 1000,
      owner: 1234,
    },
    roomMember: [],
    currentRoundMembers: [],
    currentRound: 1,
  },
  {
    roomInfo: {
      roomId: "234567",
      roomName: "Phòng 2",
      roomMaxUser: 8,
      roomPassword: null,
      roomUsePassword: false,
      roomBet: 1000,
      owner: 1234,
    },
    roomMember: [],
    currentRoundMembers: [],
    currentRound: 1,
  },
];

const getSocketIdOfUser = (userId) => {
  const user = connectedUsers.find((user) => user.userId === userId);
  return user?.id;
};
const disconnectUser = (socket) => {
  const index = connectedUsers.findIndex((user) => user.id === socket.id);
  const user = connectedUsers[index];
  if (index !== -1) {
    connectedUsers.splice(index, 1); // Xóa khỏi mảng
  }
  leaveRoom(user?.userId);
};

const createdRoom = (roomInfo) => {
  listRooms.push({
    roomInfo,
    roomMember: [],
    currentRoundMembers: [],
  });
};

const joinRoom = (data) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
  const checkIsMember = room?.roomMember?.find((member) => member.userId === data.userId);
  if (room && !checkIsMember) {
    room.roomMember.push(data.userId);
  }
};

const leaveRoom = (userId) => {
  const room = listRooms.find((room) => room.roomMember.includes(userId));
  if (room) {
    room.roomMember = room.roomMember.filter((member) => member !== userId);
  }
};

const getCurrentRoom = (roomId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  return room;
};

const getRoomMembers = (roomId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  const listMemberOfRoom = room?.roomMember?.map((member) => {
    return connectedUsers.find((user) => user.userId === member);
  });
  return listMemberOfRoom;
};
const getCurrentRoomOfUser = (socketId) => {
  const userBySocketId = connectedUsers.find((user) => user.id === socketId);
  if (!userBySocketId) return null;
  const room = listRooms.find((room) => room.roomMember.includes(userBySocketId?.userId));
  return room;
};

const checkMemberBeforeStartGame = (roomId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  if (room?.roomMember?.length < 2) {
    return false;
  }
  if (room?.roomMember?.length !== room?.roomInfo.roomMaxUser) {
    return false;
  }
  return true;
};

const startNewGame = (roomId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  room.currentRoundMembers = room.roomMember;
  room.currentRound = 1;
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

    socket.on("joinRoom", (data) => {
      joinRoom(data);
      socket.join(data.roomId);
      socket.emit("joinRoomSuccess", getCurrentRoom(data.roomId));
      socket.emit("currentRoom", getCurrentRoom(data.roomId));
      io.emit("roomMembers", getRoomMembers(data.roomId));
    });

    socket.on("getRoomMembers", (roomId) => {
      io.emit("roomMembers", getRoomMembers(roomId));
    });

    // start game
    socket.on("startGame", (data) => {
      if (!checkMemberBeforeStartGame(data.roomId)) {
        socket.emit("startGameError", "Số lượng người chơi chưa đủ để bắt đầu!");
        return;
      }
      startNewGame(data.roomId);
      const currentRoom = getCurrentRoom(data.roomId);
      for (let i = 0; i < currentRoom.currentRoundMembers.length / 2; i++) {
        const team1 = currentRoom.currentRoundMembers[i];
        const team2 = currentRoom.currentRoundMembers[currentRoom.currentRoundMembers.length - i - 1];
        io.to(getSocketIdOfUser(team1)).emit("startRoundGame", { team1, team2 });
        io.to(getSocketIdOfUser(team2)).emit("startRoundGame", { team1, team2 });
      }
    });

    // Khi client ngắt kết nối
    socket.on("disconnect", () => {
      const roomOfUserWithSocketId = getCurrentRoomOfUser(socket.id);
      disconnectUser(socket);
      if (roomOfUserWithSocketId) {
        socket
          .to(roomOfUserWithSocketId.roomInfo.roomId)
          .emit("roomMembers", getRoomMembers(roomOfUserWithSocketId.roomInfo.roomId));
      }
      io.emit("listUsers", connectedUsers);
    });
  });
};

setupSocketServer(server);
