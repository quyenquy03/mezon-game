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
const listRooms = [];

// get socket id of user to send socket message to an user
const getSocketIdOfUser = (userId) => {
  const user = connectedUsers.find((user) => user.userId === userId);
  return user?.id;
};

// get user info by userId
const getUserInfo = (userId) => {
  const user = connectedUsers.find((user) => user.userId === userId);
  return user;
};

// disconnect user, remove user from connectedUsers array and remove user from room
const disconnectUser = (socket) => {
  const index = connectedUsers.findIndex((user) => user.id === socket.id);
  const user = connectedUsers[index];
  if (index !== -1) {
    connectedUsers.splice(index, 1); // Xóa khỏi mảng
  }
  leaveRoom(user?.userId);
};

// create new room and push new room info to listRooms
const createdRoom = (roomInfo) => {
  listRooms.push({
    roomInfo,
    roomMember: [],
    currentRoundMembers: [],
    currentRoundGroup: [],
    currentRound: 1,
    isPlaying: false,
    roundGames: [],
  });
};

// check room before join room, return error message if room is not valid
const checkBeforeJoinRoom = (data) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
  if (!room) {
    return "Phòng không tồn tại!";
  }
  const checkUser = room.roomMember.filter((member) => member !== null);
  if (checkUser.length === room.roomInfo.roomMaxUser) {
    return "Phòng đã đầy!";
  }
  if (room.isPlaying) {
    return "Phòng này đang trong trạng thái chơi!";
  }
  if (room.roomMember.includes(data.userId)) {
    return "Bạn đã ở trong phòng!";
  }
  return null;
};

// join room and push user to roomMember array of room
const joinRoom = (data) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
  const checkIsMember = room?.roomMember?.find((member) => member.userId === data.userId);
  if (room && !checkIsMember && data.userId) {
    room.roomMember.push(data.userId);
  }
};

// leave room and remove user from roomMember array of room
const leaveRoom = (userId) => {
  const room = listRooms.find((room) => room.roomMember.includes(userId));
  if (room) {
    room.roomMember = room.roomMember.filter((member) => member !== userId);
  }
  if (room?.roomMember.length === 0) {
    const index = listRooms.findIndex((room) => room.roomMember.length === 0);
    listRooms.splice(index, 1);
  }
};

// get current room by roomId, return room info
const getCurrentRoom = (roomId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  return room;
};

// get room info of user by userId
const getRoomOfUser = (userId) => {
  const room = listRooms.find((room) => room.roomMember.includes(userId));
  return room;
};

// get room members by roomId, return list of members
const getRoomMembers = (roomId) => {
  const room = listRooms?.find((room) => room.roomInfo.roomId === roomId);
  const listMemberOfRoom = room?.roomMember?.map((member) => {
    return connectedUsers?.find((user) => user.userId === member);
  });
  listMemberOfRoom?.filter((member) => member !== null);
  return listMemberOfRoom;
};

// get current room of user by socketId, return room info
const getCurrentRoomOfUser = (socketId) => {
  const userBySocketId = connectedUsers?.find((user) => user.id === socketId);
  if (!userBySocketId) return null;
  const room = listRooms.find((room) => room.roomMember?.includes(userBySocketId?.userId));
  return room;
};

// check member before start game, return true if member is enough to start game
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

// start bet, decrease money of user by room bet, increase total bet of room
const startBet = (roomId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);

  // decrease money of all user in room when start game
  connectedUsers.forEach((user) => {
    if (room.roomMember.includes(user.userId)) {
      user.money -= room.roomInfo.roomBet;
    }
  });

  // total bet of room will be given to winner after game
  room.totalBet = room.roomInfo.roomBet * room.roomInfo.roomMaxUser;
};

// end bet, increase money of winner by total bet of room
const endBet = (roomId, winnerId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  const user = connectedUsers.find((user) => user.userId === winnerId);
  user.userCoin += room.totalBet;
};

const startNewGame = (roomId) => {
  // find room and reset room info before start new game
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  room.currentRoundMembers = room.roomMember;
  room.currentRound = 1;
  room.isPlaying = true;
  room.roundGames = [];
  const listGroup = [];

  // loop to create group of players for each round, each group has 2 players and each player will play with each other
  for (let i = 0; i < room.currentRoundMembers.length / 2; i++) {
    const turnCount = room.roomInfo.roomRound;
    const turnResult = [];
    for (let j = 0; j < turnCount; j++) {
      turnResult.push({
        turn: j + 1,
        player1Choice: "",
        player2Choice: "",
        winner: null,
      });
    }
    listGroup.push({
      groupId: makeid(6),
      player1: room.currentRoundMembers[i],
      player2: room.currentRoundMembers[room.currentRoundMembers.length - i - 1],
      result: turnResult,
    });
  }
  const newRound = {
    roundId: makeid(6),
    round: room.currentRound,
    listPlayer: room.roomMember,
    group: listGroup,
    currentTurn: 1,
  };

  // push new round to room info to keep track of game
  room.roundGames.push(newRound);
};

// check result of one game, return winner of game
const checkResultOfOneGame = (player1, player2, player1Choice, player2Choice) => {
  if (player1Choice === player2Choice) {
    return null;
  }
  if (!player1Choice) {
    return player2;
  }
  if (!player2Choice) {
    return player1;
  }
  if (player1Choice === "rock" && player2Choice === "scissors") {
    return player1;
  }
  if (player1Choice === "rock" && player2Choice === "paper") {
    return player2;
  }
  if (player1Choice === "paper" && player2Choice === "rock") {
    return player1;
  }
  if (player1Choice === "paper" && player2Choice === "scissors") {
    return player2;
  }
  if (player1Choice === "scissors" && player2Choice === "rock") {
    return player2;
  }
  if (player1Choice === "scissors" && player2Choice === "paper") {
    return player1;
  }
};

function makeid(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const setupSocketServer = (server) => {
  const io = new SocketServer(server, {
    cors: {
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // when user connect to server
    socket.on("userInfo", (userInfo) => {
      connectedUsers.push({ id: socket.id, ...userInfo });
      socket.emit("userInfo", userInfo);
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
      const check = checkBeforeJoinRoom(data);
      if (check !== null) {
        socket.emit("joinRoomError", check);
        return;
      }
      joinRoom(data);
      const currentRoom = getCurrentRoom(data.roomId);
      if (currentRoom) {
        currentRoom.roomInfo.owner = currentRoom.roomMember[0];
      }
      socket.join(data.roomId);
      socket.emit("joinRoomSuccess", currentRoom);
      io.to(data.roomId).emit("currentRoom", currentRoom);
      io.to(data.roomId).emit("roomMembers", getRoomMembers(data.roomId));
    });

    socket.on("leaveRoom", (data) => {
      const currentRoom = getRoomOfUser(data.userId);
      if (currentRoom) {
        currentRoom.roomInfo.owner = currentRoom.roomMember[0];
      }
      leaveRoom(data.userId);
      const roomAfterLeave = getCurrentRoom(currentRoom?.roomInfo?.roomId);
      console.log("roomAfterLeave", roomAfterLeave);
      socket.emit("leaveRoomSuccess", roomAfterLeave);
      io.emit("listRooms", listRooms);
      io.to(roomAfterLeave?.roomInfo.roomId).emit("currentRoom", roomAfterLeave);
      io.to(roomAfterLeave?.roomInfo.roomId).emit("roomMembers", getRoomMembers(roomAfterLeave?.roomInfo.roomId));
    });

    socket.on("getRoomMembers", (roomId) => {
      io.emit("roomMembers", getRoomMembers(roomId));
    });

    socket.on("startGame", (data) => {
      if (!checkMemberBeforeStartGame(data.roomId)) {
        socket.emit("startGameError", "Số lượng người chơi chưa đủ để bắt đầu!");
        return;
      }
      if (getCurrentRoom(data.roomId).isPlaying) {
        return;
      }
      startNewGame(data.roomId);
      const currentRoom = getCurrentRoom(data.roomId);
      io.to(data.roomId).emit("startGameSuccess", {
        round: currentRoom,
        currentRound: currentRoom.currentRound,
        roundId: currentRoom.roundGames[0].roundId,
        currentRoundMembers: currentRoom.currentRoundMembers,
        roomInfo: currentRoom.roomInfo,
      });
      startBet(data.roomId);
      io.to(data.roomId).emit("startBet", currentRoom.roomInfo.roomBet);
    });
    socket.on("startRound", (data) => {
      const { roomId, userId, roundGame, roundId, currentTurn } = data;
      const currentRoom = getCurrentRoom(roomId);
      const currentRound = currentRoom.roundGames.find((round) => round.round === roundGame);
      const currentRoundGroup = currentRound.group;
      currentRound.currentTurn = currentTurn;
      if (currentRound.currentTurn > currentRoom.roomInfo.roomRound) {
        const group = currentRoundGroup.find((group) => group.player1 === userId || group.player2 === userId);
        let winCount = 0;
        let loseCount = 0;
        for (let i = 0; i < group.result.length; i++) {
          if (group.result[i].winner === userId) {
            winCount++;
          }
          if (group.result[i].winner !== userId && group.result[i].winner !== null) {
            loseCount++;
          }
        }

        if (winCount === loseCount) {
          // handle draw round
          group.result.push({
            turn: group.result.length + 1,
            player1Choice: "",
            player2Choice: "",
            winner: null,
          });
          socket.emit("startTurn", {
            currentRoom,
            yourInfo: getUserInfo(userId),
            rivalInfo: getUserInfo(group.player1 === userId ? group.player2 : group.player1),
            roomInfo: currentRoom.roomInfo,
            currentTurn: currentRound.currentTurn,
          });
          setTimeout(() => {
            socket.emit("submitTurnNow", {
              roomId,
              roundGame,
              roundId,
              currentTurn: currentRound.currentTurn,
            });
          }, 5000);
          return;
        }

        if (currentRound.listPlayer.length <= 2 && winCount > loseCount) {
          const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
          io.to(roomId).emit("endOfGame", {
            roundGame,
            roundId,
            roomId,
            currentTurn: currentRound.currentTurn,
            isWinner: winCount > loseCount,
            winner: userId,
          });
          endBet(roomId, userId);
          socket.emit("endBet", room.totalBet);
          room.isPlaying = false;
          return;
        }
        socket.emit("endOfRound", {
          roundGame,
          roundId,
          roomId,
          currentTurn: currentRound.currentTurn,
          isWinner: winCount > loseCount,
        });
        return;
      }
      for (let i = 0; i < currentRoundGroup.length; i++) {
        const group = currentRoundGroup[i];
        if (group.player1 === userId || group.player2 === userId) {
          socket.emit("startTurn", {
            currentRoom,
            yourInfo: getUserInfo(userId),
            rivalInfo: getUserInfo(group.player1 === userId ? group.player2 : group.player1),
            roomInfo: currentRoom.roomInfo,
            currentTurn: currentRound.currentTurn,
          });
          socket.join(roundId);
        }
      }

      setTimeout(() => {
        socket.emit("submitTurnNow", {
          roomId,
          roundGame,
          roundId,
          currentTurn: currentRound.currentTurn,
        });
      }, 5000);
    });
    socket.on("continueJoin", (data) => {
      const { roomId, userId, roundGame } = data;
      const currentRoom = getCurrentRoom(roomId);
      const currentRound = currentRoom.roundGames.find((round) => round.round === roundGame);
      if (!currentRound) {
        currentRoom.roundGames.push({
          roundId: makeid(6),
          round: roundGame,
          listPlayer: [],
          group: [],
          currentTurn: 1,
        });
      }
      const currentRoundNew = currentRoom.roundGames.find((round) => round.round === roundGame);
      currentRoundNew.listPlayer.push(userId);
      socket.join(currentRoundNew.roundId);
      socket.emit("continueJoinSuccess", {
        roomId,
        roundGame,
        roundId: currentRoundNew.roundId,
        currentTurn: currentRoundNew.currentTurn,
      });
    });

    socket.on("combindNextRound", (data) => {
      const { roomId, userId, roundGame, roundId } = data;
      const currentRoom = getCurrentRoom(roomId);
      const currentRound = currentRoom.roundGames?.find(
        (round) => round.round === roundGame || round.round === data.currentRound
      );
      if (currentRound.listPlayer.length === currentRoom.roomInfo.roomMaxUser / 2 ** (currentRound.round - 1)) {
        for (let i = 0; i < currentRound.listPlayer?.length / 2; i++) {
          const turnCount = currentRoom.roomInfo.roomRound;
          const turnResult = [];
          const player1 = currentRound.listPlayer[i];
          const player2 = currentRound.listPlayer[currentRound.listPlayer.length - i - 1];
          for (let j = 0; j < turnCount; j++) {
            turnResult.push({
              turn: j + 1,
              player1Choice: "",
              player2Choice: "",
              winner: null,
            });
          }
          currentRound.group.push({
            groupId: makeid(6),
            player1,
            player2,
            result: turnResult,
          });
          io.to(currentRound.roundId).emit("startGameSuccess", {
            currentRound: currentRound.round,
            roundId: currentRound.roundId,
            currentRoundMembers: currentRoom.currentRoundMembers,
            roomInfo: currentRoom.roomInfo,
            roomId,
            roundinfo: currentRound,
          });
        }
      }
    });
    socket.on("submitTurn", (data) => {
      const { roomId, userId, roundGame, currentTurn, choosedOption } = data;
      const currentRoom = getCurrentRoom(roomId);
      const currentRound = currentRoom.roundGames.find((round) => round.round === roundGame);
      const currentRoundGroup = currentRound.group;
      for (let i = 0; i < currentRoundGroup.length; i++) {
        const group = currentRoundGroup[i];
        if (group.player1 === userId && group.result[currentTurn - 1]) {
          group.result[currentTurn - 1].player1Choice = choosedOption;
        }
        if (group.player2 === userId && group.result[currentTurn - 1]) {
          group.result[currentTurn - 1].player2Choice = choosedOption;
        }
      }
    });
    socket.on("getTurnResult", (data) => {
      const { roomId, userId, roundGame, roundId, currentTurn } = data;
      const currentRoom = getCurrentRoom(roomId);
      const currentRound = currentRoom.roundGames.find((round) => round.round === roundGame);
      const currentRoundGroup = currentRound.group;
      const group = currentRoundGroup.find((group) => group.player1 === userId || group.player2 === userId);
      const checkResult = checkResultOfOneGame(
        group.player1,
        group.player2,
        group.result[currentTurn - 1]?.player1Choice,
        group.result[currentTurn - 1]?.player2Choice
      );
      if (checkResult === group.player1) {
        group.result[currentTurn - 1].winner = group.player1;
      }
      if (checkResult === group.player2) {
        group.result[currentTurn - 1].winner = group.player2;
      }
      socket.emit("getTurnResult", {
        winnerTurnId: checkResult,
        roomId,
        roundGame,
        roundId,
        currentTurn,
        yourChoice:
          group.player1 === userId ? group.result[currentTurn - 1]?.player1Choice : group.result[currentTurn - 1]?.player2Choice,
        rivalChoice:
          group.player1 === userId ? group.result[currentTurn - 1]?.player2Choice : group.result[currentTurn - 1]?.player1Choice,
        result: `${checkResult === null ? "Lượt đấu hoà" : checkResult === userId ? "Bạn thắng" : "Bạn thua"}`,
      });
    });

    // Khi client ngắt kết nối
    socket.on("disconnect", () => {
      const roomOfUserWithSocketId = getCurrentRoomOfUser(socket.id);
      disconnectUser(socket);
      if (roomOfUserWithSocketId) {
        roomOfUserWithSocketId.roomInfo.owner = roomOfUserWithSocketId.roomMember[0];
        socket.to(roomOfUserWithSocketId.roomInfo.roomId).emit("currentRoom", roomOfUserWithSocketId);
        socket
          .to(roomOfUserWithSocketId.roomInfo.roomId)
          .emit("roomMembers", getRoomMembers(roomOfUserWithSocketId.roomInfo.roomId));
      }
      io.emit("listUsers", connectedUsers);
    });
  });
};

setupSocketServer(server);
