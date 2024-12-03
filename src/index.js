import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketServer } from "socket.io";
import { json } from "stream/consumers";

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
      roomRound: 5,
    },
    roomMember: [],
    currentRoundMembers: [],
    currentRound: 1,
    room: []
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
      roomRound: 5,
    },
    roomMember: [],
    currentRoundMembers: [],
    currentRound: 1,
    room: []
  },
  {
    roomInfo: {
      roomId: "345674448",
      roomName: "Phòng 3",
      roomMaxUser: 2,
      roomPassword: null,
      roomUsePassword: false,
      roomBet: 1000,
      owner: 1234,
      roomRound: 5,
    },
    roomMember: [],
    currentRoundMembers: [],
    currentRound: 1,
    room: []
  },
];

const game = {};
let maxRounds = 0;
let players = [];
let maxPlayers = 0;
let player1;
let player2;

const getSocketIdOfUser = (userId) => {
  const user = connectedUsers.find((user) => user.userId === userId);
  return user?.id;
};

const getUserInfo = (userId) => {
  const user = connectedUsers.find((user) => user.userId === userId);
  return user;
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
    room: [],
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
  const player = [...room.roomMember];
  room.currentRoundMembers = player;
  room.currentRound = 1;
  const players = [...room.roomMember];
  room.room = createTournamentRooms(players);
};

const setupSocketServer = (server) => {
  const io = new SocketServer(server, {
    cors: {
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
      socket.emit("roomCreated", roomInfo);
      io.emit("listRooms", listRooms);
    });

    socket.on("listRooms", () => {
      io.emit("listRooms", listRooms);
    });

    socket.on("joinRoom", (data) => {
      console.log(data, 'data');
      const check = checkBeforeJoinRoom(data);
      if (check !== null) {
        socket.emit("joinRoomError", check);
        return;
      }
      const roomId = data.roomId-'mezon'- data.
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
      const gameId = makeid(6);
      for (let i = 0; i < currentRoom.room.length; i++) {
        const player1 = currentRoom.room[i].player1;
        const player2 = currentRoom.room[i].player2;
        
        io.to(getSocketIdOfUser(player1)).emit("startRoundGame", {
          yourInfo: getUserInfo(player1),
          rivalInfo: getUserInfo(player2),
          roomInfo: currentRoom,
          soloRoomId: currentRoom.room[i].roomId,
          roomUniqueId: currentRoom,
        });
        io.to(getSocketIdOfUser(player2)).emit("startRoundGame", {
          yourInfo: getUserInfo(player2),
          rivalInfo: getUserInfo(player1),
          roomInfo: currentRoom,
          soloRoomId: currentRoom.room[i].roomId,
          roomUniqueId: currentRoom,
        });
        // io.to(room).emit("playGame", {currentRoom, round: room.rounds });
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

    let roomUniqueId;

    socket.on("createGame", (data) => {
      maxRounds = data.maxRounds;
      
      socket.join(roomUniqueId);
      socket.emit("newGame", {
        roomUniqueId: roomUniqueId,
        maxRounds: maxRounds,
      });
    });

    socket.on("player", (data) => {
      let rpsValue = data.rpsValue;
      const roomActive = listRooms.find((room) => room.roomInfo.roomId === data.roomUniqueId);
      const room = roomActive?.room?.find((r) => r.roomId === data.soloRoomId);

      if (room?.player1 == data.player) {
        room.p1Choice = rpsValue;
        socket.to(data.roomUniqueId).emit("player2", { data: data });
      }
      if (room?.player2 == data.player) {
        room.p2Choice = rpsValue;
        socket.to(data.roomUniqueId).emit("player2", { data: data });
      }
      
      if (room?.p1Choice && room?.p2Choice) {
        determineWinner(room, data.roomUniqueId);
      }
    });
    
    socket.on("nextRound", (data) => {
      const gameId = data.roomUniqueId; // Replace with your room tracking logic
      if (gameId) {
        if (data.rounds < maxRounds) {
          io.to(gameId).emit("playGame", { round: data.rounds, gameId: data.roomId});
        }
      }
    });
  });
  function determineWinner(game, roomUniqueId) {
    const gameData = game;
    
    // Lấy key đầu tiên của object
    const key = Object.keys(gameData)[0];

    // Truy cập p1Choice và p2Choice
    const p1Choice = gameData.p1Choice;
    const p2Choice = gameData.p2Choice;
    let winner;
    let name;
    // Xử lý kết quả của mỗi round
    if (!p1Choice && !p2Choice) {
      winner = "d"; // Hòa nếu cả hai không chọn
    } else if (!p1Choice) {
      winner = "p2"; // Player 1 không chọn
      name = gameData.player2;
    } else if (!p2Choice) {
      winner = "p1"; // Player 2 không chọn
      name = gameData.player1;
    } else if (p1Choice === p2Choice) {
      winner = "d"; // Hòa nếu cả hai chọn giống nhau
    } else if (p1Choice == "paper") {
      winner = p2Choice == "scissors" ? "p2" : "p1";
      name = p2Choice == "scissors" ? gameData.player2 : gameData.player1;
    } else if (p1Choice == "rock") {
      winner = p2Choice == "paper" ? "p2" : "p1";
      name = p2Choice == "paper" ? gameData.player2 : gameData.player1;
    } else if (p1Choice == "scissors") {
      winner = p2Choice == "rock" ? "p2" : "p1";
      name = p2Choice == "rock" ? gameData.player2 : gameData.player1;
    }

    // Cập nhật số lượt thắng và chuỗi thắng
    if (winner == "p1") {
      gameData.p1Wins++;
    } else if (winner == "p2") {
      gameData.p2Wins++;
    }

    // Tăng số lượt chơi
    gameData.rounds++;

    // Gửi kết quả của lượt chơi
    io.sockets.to(roomUniqueId).emit("result", {
      winner: winner,
      nameWinner: name,
      maxRounds: gameData.maxRounds,
      rounds: gameData.rounds,
      p1Wins: gameData.p1Wins,
      p2Wins: gameData.p2Wins,
      gameData: gameData
    });


    // Kiểm tra thắng liên tiếp
    const requiredStreak = gameData.maxRounds / 2;

    if (gameData.p1Wins >= requiredStreak) {
      endGame(roomUniqueId, "p1", name, gameData);
      return;
    }
    if (gameData.p2Wins >= requiredStreak) {
      endGame(roomUniqueId, "p2", name, gameData);
      return;
    }

    // Kiểm tra kết thúc game khi hết round
    if (gameData.rounds == gameData.maxRounds) {
      const finalWinner =
        gameData.p1Wins > gameData.p2Wins
          ? "p1"
          : gameData.p2Wins > gameData.p1Wins
            ? "p2"
            : "d"; // Hòa nếu số lượt thắng bằng nhau
      
      endGame(roomUniqueId, finalWinner, name, gameData);
      return;
    }

    gameData.p1Choice = null;
    gameData.p2Choice = null;
  }

  function endGame(roomUniqueId, finalWinner, name, gameData) {
    io.sockets.to(roomUniqueId).emit("gameOver", {
      winner: finalWinner,
      nameWinner: name,
      p1Wins: gameData.p1Wins,
      p2Wins: gameData.p2Wins,
      rounds: gameData.rounds,
    });

    gameData.p1Choice = null;
    gameData.p2Choice = null;
    gameData.p1Wins = 0;
    gameData.p2Wins = 0;
    gameData.rounds = 0;
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
};

const createTournamentRooms = (players) => {
  const rooms = [];
  let roomIdCounter = 1;
  
  while (players.length > 1) {
    const player1 = players.shift();
    const player2 = players.shift();
    const roomId = roomIdCounter++;

    rooms.push({
      player1: player1,
      player2: player2,
      p1Choice: null,
      p2Choice: null,
      roomId, players: [player1, player2], rounds: 0,
      maxRounds: 3,
      p1Wins: 0,
      p2Wins: 0
    });
  }

  const totalRooms = rooms.length;
  const nextRoundRooms = totalRooms / 2;

  for (let i = 0; i < nextRoundRooms; i++) {
    const roomId = roomIdCounter++;
    rooms.push({
      player1: 0,
      player2: 0,
      p1Choice: null,
      p2Choice: null,
      roomId, players: [], rounds: 0,
      maxRounds: 3,
      p1Wins: 0,
      p2Wins: 0
    });
  }

  if (nextRoundRooms > 1) {
    const finalRoomId = roomIdCounter++;
    rooms.push({
      player1: 0,
      player2: 0,
      p1Choice: null,
      p2Choice: null,
      roomId: finalRoomId, players: [], rounds: 0,
      maxRounds: 3,
      p1Wins: 0,
      p2Wins: 0
    });
  }

  return rooms;
};

setupSocketServer(server);
