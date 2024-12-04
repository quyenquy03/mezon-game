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

const connectedUsers = [];
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
      roomRound: 3,
    },
    roomMember: [],
    currentRoundMembers: [],
    currentRound: 1,
  },
  // {
  //   roomInfo: {
  //     roomId: "234567",
  //     roomName: "Phòng 2",
  //     roomMaxUser: 8,
  //     roomPassword: null,
  //     roomUsePassword: false,
  //     roomBet: 1000,
  //     owner: 1234,
  //     roomRound: 5,
  //   },
  //   roomMember: [],
  //   currentRoundMembers: [],
  //   currentRound: 1,
  // },
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
  },
];

const game = {};
let maxRounds = 0;
let players = new Set();


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
  });
};

const checkBeforeJoinRoom = (data) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
  if (!room) {
    return "Room does not exist!";
  }
  const checkUser = room.roomMember.filter((member) => member !== null);
  if (checkUser.length === room.roomInfo.roomMaxUser) {
    return "This room is full!";
  }
  if (room.roomMember.includes(data.userId)) {
    return "You were in the room!";
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
        const gameId = makeid(6);
        // socket.join(gameId);
        const socketId1 = getSocketIdOfUser(team1);
        const socketId2 = getSocketIdOfUser(team2);
        io.sockets.sockets.get(socketId1)?.join(gameId);
        io.sockets.sockets.get(socketId2)?.join(gameId);

        io.to(socketId1).emit("startRoundGame", {
          yourInfo: getUserInfo(team1),
          rivalInfo: getUserInfo(team2),
          roomInfo: currentRoom,
          gameId: gameId,
          roomUniqueId: currentRoom,
        });
        io.to(socketId2).emit("startRoundGame", {
          yourInfo: getUserInfo(team2),
          rivalInfo: getUserInfo(team1),
          roomInfo: currentRoom,
          gameId: gameId,
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
        console.log("roomOfUserWithSocketId: ", roomOfUserWithSocketId);
        socket
          .to(roomOfUserWithSocketId.roomInfo.roomId)
          .emit("roomMembers", getRoomMembers(roomOfUserWithSocketId.roomInfo.roomId));
      }
      io.emit("listUsers", connectedUsers);
    });

    socket.on("createGame", (data) => {
      console.log('gameInfo:', data);
      maxRounds = data.roomUniqueId.roomInfo.roomRound;
      game[data.gameId] = {
        player1: data.player1,
        player2: data.player2,
        p1Choice: null,
        p2Choice: null,
        rounds: 0, // Số lượt chơi hiện tại
        maxRounds: maxRounds, // Số lượt chơi tối đa
        p1Wins: 0, // Số lượt thắng của player 1
        p2Wins: 0,
        roomId: data.roomUniqueId.roomInfo.roomId,
      };
      // socket.join(data.gameId);
    });

    // socket.emit("newGame", {
    //     roomUniqueId: roomUniqueId,
    //     maxRounds: maxRounds,
    //   });

    socket.on("player", (data) => {
      // console.log('player: ', data);
      // let player = {user: data.player.userId, value: data.rpsValue};
      let rpsValue = data.rpsValue;
      if (game[data.gameId].player1.userId == data.player) {
        // console.log('da vao day p1: ', data);

        game[data.gameId].p1Choice = rpsValue;
        socket.to(data.gameId).emit("player2", { data: data });
      }
      if (game[data.gameId].player2.userId == data.player) {
        // console.log('da vao day p2: ', data);

        game[data.gameId].p2Choice = rpsValue;
        socket.to(data.gameId).emit("player2", { data: data });
      }
      if (game[data.gameId].p2Choice && game[data.gameId].p1Choice) {
        determineWinner(game[data.gameId], data.gameId);
      }
    });

    // socket.on("player2", (data) => {
    //   console.log('player2: ', data);

    //   let rpsValue = data.rpsValue;
    //   game[data.roomUniqueId].p2Choice = rpsValue;
    //   socket.to(data.roomUniqueId).emit("player2", { rpsValue: data.rpsValue });
    //   if (game[data.roomUniqueId].p1Choice != null) {
    //     determineWinner(data.roomUniqueId);
    //   }
    // });

    socket.on("nextRound", (data) => {
      const gameId = data.roomUniqueId; // Replace with your room tracking logic
      if (gameId) {
        if (data.rounds < maxRounds) {
          io.to(gameId).emit("playGame", { round: data.rounds });
        }
      }
    });

    socket.on("handleWinner", (data) => {      
      players.add(data.winnerId);
      console.log('winners:', players);
      
      if (players.size > 1) {
        let currentRoom = getCurrentRoom(data.roomId);
        console.log(currentRoom.roomMember);
          currentRoom.roomMember = currentRoom.roomMember.filter(member => players.has(member));
        console.log('currentRoom:', currentRoom);
      }
    })
  });
  function determineWinner(game, gameId) {
    const gameData = game;
    console.log('gameData:', game);

    // Lấy key đầu tiên của object
    // const keys = Object.keys(gameData);

    // Truy cập p1Choice và p2Choice
    const p1Choice = gameData.p1Choice;
    const p2Choice = gameData.p2Choice;

    let winner;
    let name;
    let winnerId;
    // Xử lý kết quả của mỗi round
    if (!p1Choice && !p2Choice) {
      winner = "d"; // Hòa nếu cả hai không chọn
    } else if (!p1Choice) {
      winner = "p2"; // Player 1 không chọn
      name = gameData.player2.name;
    } else if (!p2Choice) {
      winner = "p1"; // Player 2 không chọn
      name = gameData.player1.name;
    } else if (p1Choice === p2Choice) {
      winner = "d"; // Hòa nếu cả hai chọn giống nhau
    } else if (p1Choice == "paper") {
      winner = p2Choice == "scissors" ? "p2" : "p1";
      name = p2Choice == "scissors" ? gameData.player2.name : gameData.player1.name;
      winnerId = p2Choice == "scissors" ? gameData.player2.userId : gameData.player1.userId;
    } else if (p1Choice == "rock") {
      winner = p2Choice == "paper" ? "p2" : "p1";
      name = p2Choice == "paper" ? gameData.player2.name : gameData.player1.name;
      winnerId = p2Choice == "paper" ? gameData.player2.userId : gameData.player1.userId;
    } else if (p1Choice == "scissors") {
      winner = p2Choice == "rock" ? "p2" : "p1";
      name = p2Choice == "rock" ? gameData.player2.name : gameData.player1.name;
      winnerId = p2Choice == "rock" ? gameData.player2.userId : gameData.player1.userId;
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
    io.sockets.to(gameId).emit("result", {
      winner: winner,
      nameWinner: name,
      maxRounds: gameData.maxRounds,
      rounds: gameData.rounds,
      p1Wins: gameData.p1Wins,
      p2Wins: gameData.p2Wins,
      roomId: gameData.roomId,
    });

    // Kiểm tra thắng liên tiếp
    const requiredStreak = gameData.maxRounds / 2;
    if (gameData.p1Wins >= requiredStreak) {
      endGame(gameId, "p1", name);
      return;
    }
    if (gameData.p2Wins >= requiredStreak) {
      endGame(gameId, "p2", name);
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
      endGame(gameId, finalWinner, name, winnerId);
      return;
    }
    gameData.p1Choice = null;
    gameData.p2Choice = null;
  }

  function endGame(gameId, finalWinner, name, winnerId) {
    io.sockets.to(gameId).emit("gameOver", {
      winner: finalWinner,
      nameWinner: name,
      winnerId: winnerId,
      p1Wins: game[gameId].p1Wins,
      p2Wins: game[gameId].p2Wins,
      rounds: game[gameId].rounds,
      roomId: game[gameId].roomId,
    });
    
    // Xóa dữ liệu phòng khi game kết thúc (nếu cần)
    delete game[gameId];
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

setupSocketServer(server);
