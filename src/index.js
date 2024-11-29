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

app.get("/game", function (req, res) {
  res.sendFile(path.join(__dirname, "client", "game.html"));
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
  {
    roomInfo: {
      roomId: "345678",
      roomName: "Phòng 2",
      roomMaxUser: 2,
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

const room = {};
let maxRounds = 0;
let players = [];
let maxPlayers = 0;

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

const checkBeforeJoinRoom = (data) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
  if (!room) {
    return "Phòng không tồn tại!";
  }
  const checkUser = room.roomMember.filter((member) => member !== null);
  if (checkUser.length === room.roomInfo.roomMaxUser) {
    return "Phòng đã đầy!";
  }
  if (room.roomMember.includes(data.userId)) {
    return "Bạn đã ở trong phòng!";
  }
  return null;
};

const joinRoom = (data) => {
  console.log("data: ", data);
  const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
  const checkIsMember = room?.roomMember?.find((member) => member.userId === data.userId);
  if (room && !checkIsMember && data.userId) {
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
  listMemberOfRoom.filter((member) => member !== null);
  console.log(listMemberOfRoom);
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
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  function determineWinner(roomUniqueId) {
    let p1Choice = room[roomUniqueId].p1Choice;
    let p2Choice = room[roomUniqueId].p2Choice;
    let winner = null;
    console.log("p1Choice: ", p1Choice);
    console.log("p2Choice: ", p2Choice);
    console.log("room: ", room);

    // Xử lý kết quả của mỗi round
    if (!p1Choice && !p2Choice) {
      winner = "d"; // Hòa nếu cả hai không chọn
    } else if (!p1Choice) {
      winner = "p2"; // Player 1 không chọn
    } else if (!p2Choice) {
      winner = "p1"; // Player 2 không chọn
    } else if (p1Choice === p2Choice) {
      winner = "d"; // Hòa nếu cả hai chọn giống nhau
    } else if (p1Choice == "Paper") {
      winner = p2Choice == "Scissors" ? "p2" : "p1";
    } else if (p1Choice == "Rock") {
      winner = p2Choice == "Paper" ? "p2" : "p1";
    } else if (p1Choice == "Scissors") {
      winner = p2Choice == "Rock" ? "p2" : "p1";
    }

    // Cập nhật số lượt thắng và chuỗi thắng
    if (winner === "p1") {
      room[roomUniqueId].p1Wins++;
    } else if (winner === "p2") {
      room[roomUniqueId].p2Wins++;
    }

    // Tăng số lượt chơi
    room[roomUniqueId].rounds++;

    // Gửi kết quả của lượt chơi
    io.sockets.to(roomUniqueId).emit("result", {
      winner: winner,
      maxRounds: room[roomUniqueId].maxRounds,
      rounds: room[roomUniqueId].rounds,
      p1Wins: room[roomUniqueId].p1Wins,
      p2Wins: room[roomUniqueId].p2Wins,
    });

    // Kiểm tra thắng liên tiếp
    const requiredStreak = maxRounds / 2;
    if (room[roomUniqueId].p1Wins >= requiredStreak) {
      endGame(roomUniqueId, "p1");
      return;
    }
    if (room[roomUniqueId].p2Wins >= requiredStreak) {
      endGame(roomUniqueId, "p2");
      return;
    }

    // Kiểm tra kết thúc game khi hết round
    if (room[roomUniqueId].rounds == room[roomUniqueId].maxRounds) {
      const finalWinner =
        room[roomUniqueId].p1Wins > room[roomUniqueId].p2Wins
          ? "p1"
          : room[roomUniqueId].p2Wins > room[roomUniqueId].p1Wins
          ? "p2"
          : "d"; // Hòa nếu số lượt thắng bằng nhau
      endGame(roomUniqueId, finalWinner);
      return;
    }

    room[roomUniqueId].p1Choice = null;
    room[roomUniqueId].p2Choice = null;
  }

  function endGame(roomUniqueId, finalWinner) {
    io.sockets.to(roomUniqueId).emit("gameOver", {
      winner: finalWinner,
      p1Wins: room[roomUniqueId].p1Wins,
      p2Wins: room[roomUniqueId].p2Wins,
      rounds: room[roomUniqueId].rounds,
    });

    // Xóa dữ liệu phòng khi game kết thúc (nếu cần)
    delete room[roomUniqueId];
  }

  function makeid(length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
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
      console.log("roomInfo: ", roomInfo);
      createdRoom(roomInfo);
      socket.emit("roomCreated", roomInfo);
      io.emit("listRooms", listRooms);
    });

    socket.on("listRooms", () => {
      io.emit("listRooms", listRooms);
    });

    socket.on("joinRoom", (data) => {
      const check = checkBeforeJoinRoom(data);
      if (check !== null) {
        socket.emit("joinRoomError", check);
        return;
      }
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
        console.log("roomOfUserWithSocketId: ", roomOfUserWithSocketId);
        socket
          .to(roomOfUserWithSocketId.roomInfo.roomId)
          .emit("roomMembers", getRoomMembers(roomOfUserWithSocketId.roomInfo.roomId));
      }
      io.emit("listUsers", connectedUsers);
    });

    socket.on("createGame", (data) => {
      const roomUniqueId = makeid(6);
      maxRounds = data.maxRounds;
      maxPlayers = data.maxPlayers;
      room[roomUniqueId] = {
        p1Choice: null,
        p2Choice: null,
        rounds: 0, // Số lượt chơi hiện tại
        maxRounds: data.maxRounds, // Số lượt chơi tối đa
        p1Wins: 0, // Số lượt thắng của player 1
        p2Wins: 0,
        maxPlayers: data.maxPlayers,
      };

      socket.join(roomUniqueId);
      socket.emit("newGame", {
        roomUniqueId: roomUniqueId,
        maxRounds: maxRounds,
      });
    });

    socket.on("joinGame", (data) => {
      if (room[data.roomUniqueId] != null) {
        socket.join(data.roomUniqueId);
        socket.to(data.roomUniqueId).emit("playersConnected", {});
        socket.emit("playersConnected");
        // socket.to(data.roomUniqueId).emit("playGame", {});
        // socket.emit("playGame");
        if (players.length < maxPlayers) {
          players.push({ namePlayer: data.namePlayer, eliminated: false });
        } else {
          socket.emit("fullRoom");
        }
      }
    });

    socket.on("p1Choice", (data) => {
      let rpsValue = data.rpsValue;
      room[data.roomUniqueId].p1Choice = rpsValue;
      socket.to(data.roomUniqueId).emit("p1Choice", { rpsValue: data.rpsValue });
      if (room[data.roomUniqueId].p2Choice != null) {
        determineWinner(data.roomUniqueId);
      }
    });

    socket.on("p2Choice", (data) => {
      let rpsValue = data.rpsValue;
      room[data.roomUniqueId].p2Choice = rpsValue;
      socket.to(data.roomUniqueId).emit("p2Choice", { rpsValue: data.rpsValue });
      if (room[data.roomUniqueId].p1Choice != null) {
        determineWinner(data.roomUniqueId);
      }
    });

    socket.on("nextRound", (data) => {
      const room = data.roomUniqueId; // Replace with your room tracking logic
      if (room) {
        if (data.rounds < maxRounds) {
          console.log("da vao day");
          io.to(room).emit("playGame", { round: room.rounds });
        }
      }
    });
  });
};

setupSocketServer(server);
