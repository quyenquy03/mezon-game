import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Server as SocketServer } from "socket.io";
import dotenv from "dotenv";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3100;
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

const server = app.listen(PORT, function () {
  console.log(`Example app listening on port ${PORT} with domain http://localhost:${PORT}`);
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
const disconnectUser = (socketId) => {
  const index = connectedUsers.findIndex((user) => user.id === socketId);
  const user = connectedUsers[index];
  if (index !== -1) {
    connectedUsers.splice(index, 1); // Xóa khỏi mảng
  }
  leaveRoom(user?.userId);
};

// create new room and push new room info to listRooms
const createdRoom = (roomInfo) => {
  listRooms.push({
    roomInfo, // use to store room info
    roomMember: [], // use to store list id of user in room
    currentRoundMembers: [], // use to store info of user in current round
    currentRound: 1, // use to store current round of room
    currentGameId: "", // use to store current game id
    isPlaying: false, // use to check room is playing or not
    roundGames: [], // use to store list of round game
    totalBet: 0, // use to store total bet of room
    isReady: [], // use to store list of user ready to play game
    userWatchers: [], // use to store list of user watching game { userId, targetId }
    memberStatus: [], // use to store status of member in room { userId, status: "pending" | "playing" | "lose"}
  });
};

// check room before join room, return error message if room is not valid
const checkBeforeJoinRoom = (data) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === data.roomId);
  const user = connectedUsers?.find((user) => user.userId === data.userId);
  if (!room) {
    return "Phòng không tồn tại!";
  }
  if (room.roomInfo?.roomBet > user?.wallet) {
    return "Số dư không đủ để tham gia phòng!";
  }
  const checkUser = room.roomMember?.filter((member) => member !== null && member !== data.userId);

  if (checkUser?.length === room.roomInfo?.roomMaxUser) {
    return "Phòng đã đầy!";
  }
  if (room.isPlaying) {
    return "Phòng này đang trong trạng thái chơi!";
  }
  // if (room.roomMember?.includes(data.userId)) {
  //   return "Bạn đã ở trong phòng!";
  // }
  return null;
};

// join room and push user to roomMember array of room
const joinRoom = (data) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === data.roomId);
  const checkIsMember = room?.roomMember?.find((member) => member === data.userId);
  if (room && !checkIsMember && data.userId) {
    room.roomMember.push(data.userId);
    const checkIsReady = room.isReady?.find((member) => member.userId === data.userId);
    if (!checkIsReady) {
      room.isReady.push({
        userId: data.userId,
        isReady: false,
      });
    }
  }
};

// leave room and remove user from roomMember array of room
const leaveRoom = (userId) => {
  const room = listRooms?.find((room) => room.roomMember?.includes(userId));
  if (room) {
    room.roomMember = room.roomMember?.filter((member) => member !== userId);
    room.isReady = room.isReady?.filter((member) => member.userId !== userId);
  }
  if (room?.roomMember.length === 0) {
    const index = listRooms?.findIndex((room) => room.roomMember.length === 0);
    listRooms.splice(index, 1);
  }
};

// get current room by roomId, return room info
const getCurrentRoom = (roomId) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
  return room;
};

// get room info of user by userId
const getRoomOfUser = (userId) => {
  const room = listRooms?.find((room) => room.roomMember?.includes(userId));
  return room;
};

// get user info by socketId
const getUserBySocketId = (socketId) => {
  const user = connectedUsers.find((user) => user.id === socketId);
  return user;
};

// get room members by roomId, return list of members
const getRoomMembers = (roomId) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
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
  const room = listRooms?.find((room) => room.roomMember?.includes(userBySocketId?.userId));
  return room;
};

// check member before start game, return true if member is enough to start game
const checkMemberBeforeStartGame = (roomId) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
  if (room?.roomMember?.length < 2) {
    return false;
  }
  if (room?.roomMember?.length !== room?.roomInfo?.roomMaxUser) {
    return false;
  }
  return true;
};

// start bet, decrease money of user by room bet, increase total bet of room
const startBet = (roomId) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
  // decrease money of all user in room when start game
  connectedUsers.forEach((user) => {
    if (room.roomMember?.includes(user.userId)) {
      user.wallet -= room.roomInfo?.roomBet;
    }
  });

  // total bet of room will be given to winner after game
  room.totalBet = room.roomInfo?.roomBet * room.roomInfo?.roomMaxUser;
};

// end bet, increase money of winner by total bet of room
const endBet = (roomId, winnerId) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
  const user = connectedUsers.find((user) => user.userId === winnerId);
  user.wallet += room.totalBet;
};

const startNewGame = (roomId) => {
  // find room and reset room info before start new game
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
  room.currentRoundMembers = room?.roomMember;
  room.currentRound = 1;
  room.isPlaying = true;
  room.roundGames = [];
  const listGroup = [];
  room.userWatchers = [];
  room.currentGameId = makeid(10);
  room.memberStatus = room?.roomMember.map((member) => ({
    userId: member,
    status: "pending",
    userInfo: getUserInfo(member),
    rivalInfo: null,
    result: [],
    currentTurn: 1,
  }));
  // loop to create group of players for each round, each group has 2 players and each player will play with each other
  for (let i = 0; i < room.currentRoundMembers.length / 2; i++) {
    const turnCount = room.roomInfo?.roomRound;
    const turnResult = [];
    for (let j = 0; j < turnCount; j++) {
      turnResult.push({
        turn: j + 1,
        player1Choice: null,
        player2Choice: null,
        winner: null,
      });
    }
    listGroup.push({
      groupId: makeid(6),
      player1: room.currentRoundMembers[i],
      player2: room.currentRoundMembers[room.currentRoundMembers.length - i - 1],
      result: [...turnResult],
    });

    const roomStatus = room.memberStatus?.find((member) => member.userId === room.currentRoundMembers[i]);
    roomStatus.rivalInfo = getUserInfo(room.currentRoundMembers[room.currentRoundMembers.length - i - 1]);
    // roomStatus.result = [...turnResult];
    const roomStatusRival = room.memberStatus?.find(
      (member) => member.userId === room.currentRoundMembers[room.currentRoundMembers.length - i - 1]
    );
    roomStatusRival.rivalInfo = getUserInfo(room.currentRoundMembers[i]);
    // roomStatusRival.result = [...turnResult];
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

const changeStatusOfMember = (roomId, userId, status) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
  const member = room?.memberStatus?.find((member) => member.userId === userId);
  if (member) {
    member.status = status;
  }
};

// check result of one game, return winner of game
const checkResultOfOneGame = (player1, player2, player1Choice, player2Choice) => {
  if (player1Choice === player2Choice) {
    return null;
  }
  if ((player1Choice === null || player1Choice?.trim() === "") && (player2Choice === null || player2Choice?.trim() === "")) {
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

const getGameMemberStatus = (roomId) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
  const memberStatus = room?.memberStatus?.map((member) => {
    return {
      userInfo: getUserInfo(member.userId),
      status: member.status,
    };
  });
  return memberStatus;
};
const getGameOfMember = (roomId, userId) => {
  const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
  const member = room?.memberStatus?.find((member) => member.userId === userId);
  return member;
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

const getRewardFromBot = async (currentGameId, winner, amount) => {
  const API_KEY = process.env.API_KEY ?? "";
  const APP_ID = process.env.APP_ID ?? "";
  const url = process.env.REWARD_URL ?? "";
  const headers = {
    apiKey: API_KEY,
    appId: APP_ID,
    "Content-Type": "application/json",
  };

  const data = {
    sessionId: currentGameId,
    userRewardedList: [{ userId: winner, amount }],
  };
  console.log("Data:", data);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data),
    });
    console.log("Response:", response);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Result:", result);
    return {
      isSuccess: true,
      message: "Success",
      data: result,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      isSuccess: false,
      message: "Error",
      data: null,
    };
  }
};

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
      const user = connectedUsers.find((user) => user.userId === userInfo.userId);
      if (user) {
        user.id = socket.id;
      } else {
        connectedUsers.push({ id: socket.id, ...userInfo });
      }
      socket.emit("userInfo", userInfo);
      io.emit("listUsers", connectedUsers);
    });

    socket.on("listUsers", () => {
      io.emit("listUsers", connectedUsers);
    });

    // Tạo phòng mới
    socket.on("createRoom", (roomInfo) => {
      const user = connectedUsers.find((user) => user.userId === roomInfo.owner);
      if (user.wallet < roomInfo.roomBet) {
        socket.emit("joinRoomError", "Số dư không đủ để tạo phòng!");
        return;
      }
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

      const room = listRooms?.find((room) => room.roomInfo?.roomId === data.roomId);
      if (room?.roomInfo?.roomUsePassword && (!data?.password || data?.password?.trim() === "")) {
        socket.emit("joinRoomWithPassword", data);
        return;
      }

      if (room?.roomInfo?.roomUsePassword && data?.password !== room?.roomInfo?.roomPassword) {
        socket.emit("joinRoomError", "Mật khẩu phòng không đúng!");
        return;
      }

      joinRoom(data);
      const currentRoom = getCurrentRoom(data.roomId);
      if (currentRoom) {
        currentRoom.roomInfo.owner = currentRoom.roomMember[0];
      }
      const roomMembers = getRoomMembers(data.roomId);
      socket.join(data.roomId);
      socket.emit("joinRoomSuccess", currentRoom);
      io.to(data.roomId).emit("currentRoom", {
        currentRoom,
        roomMembers: roomMembers,
      });
      io.to(data.roomId).emit("roomMembers", roomMembers);
    });

    socket.on("leaveRoom", (data) => {
      const currentRoom = getRoomOfUser(data.userId);
      if (currentRoom) {
        currentRoom.roomInfo.owner = currentRoom.roomMember[0];
      }
      leaveRoom(data.userId);
      const roomAfterLeave = getCurrentRoom(currentRoom?.roomInfo?.roomId);
      const roomMembers = getRoomMembers(currentRoom?.roomInfo?.roomId);
      socket.leave(currentRoom?.roomInfo?.roomId);
      socket.emit("leaveRoomSuccess", roomAfterLeave);
      io.emit("listRooms", listRooms);
      io.to(roomAfterLeave?.roomInfo?.roomId).emit("currentRoom", {
        currentRoom: roomAfterLeave,
        roomMembers: roomMembers,
      });
      io.to(roomAfterLeave?.roomInfo?.roomId).emit("roomMembers", roomMembers);
    });

    socket.on("getRoomMembers", (roomId) => {
      io.emit("roomMembers", getRoomMembers(roomId));
    });

    socket.on("startCheckReady", (data) => {
      if (!checkMemberBeforeStartGame(data.roomId)) {
        socket.emit("startGameError", "Số lượng người chơi chưa đủ để bắt đầu!");
        return;
      }
      if (getCurrentRoom(data.roomId)?.isPlaying) {
        socket.emit("startGameError", "Phòng đang trong trạng thái chơi!");
        return;
      }
      io.to(data.roomId).emit("startCheckReady", data);

      setTimeout(() => {
        const room = getCurrentRoom(data.roomId);
        const checkIsReady = room?.isReady?.every((member) => member.isReady);
        if (checkIsReady) {
          socket.emit("startGameNow", data);
        } else {
          room?.isReady?.forEach((user) => {
            const member = user.userId;
            if (!user.isReady && user.userId !== room?.roomMember[0]) {
              leaveRoom(member);
              const roomAfterLeave = getCurrentRoom(room?.roomInfo?.roomId);
              const roomMembers = getRoomMembers(room?.roomInfo?.roomId);
              const targetSocket = io.sockets.sockets.get(getSocketIdOfUser(member));
              targetSocket.leave(room?.roomInfo?.roomId);
              targetSocket.emit("leaveRoomSuccess", roomAfterLeave);
              io.emit("listRooms", listRooms);
              io.to(roomAfterLeave?.roomInfo?.roomId).emit("currentRoom", {
                currentRoom: roomAfterLeave,
                roomMembers: roomMembers,
              });
              io.to(roomAfterLeave?.roomInfo?.roomId).emit("roomMembers", roomMembers);
            }
          });
          io.to(data.roomId).emit("startGameError", "Có người chơi chưa sẵn sàng!");
        }
        room.isReady = room?.isReady?.map((member) => {
          member.isReady = false;
          return member;
        });
      }, 10000);
    });

    socket.on("readyGame", (data) => {
      const room = getCurrentRoom(data.roomId);
      const checkIsReady = room?.isReady?.find((member) => member.userId === data.userId);
      if (checkIsReady) {
        checkIsReady.isReady = true;
      }
    });

    socket.on("startGame", (data) => {
      const room = getCurrentRoom(data.roomId);
      let checkBetOfAllMember = [];
      room?.roomMember?.forEach((member) => {
        const user = connectedUsers.find((user) => user.userId === member);
        if (user.wallet < +room.roomInfo?.roomBet) {
          checkBetOfAllMember.push(member);
        }
      });
      if (checkBetOfAllMember.length > 0) {
        socket.emit("startGameError", "Có người chơi không đủ tiền để chơi!");
        checkBetOfAllMember.forEach((member) => {
          leaveRoom(member);
          const roomAfterLeave = getCurrentRoom(room?.roomInfo?.roomId);
          const roomMembers = getRoomMembers(room?.roomInfo?.roomId);
          const targetSocket = io.sockets.sockets.get(getSocketIdOfUser(member));
          targetSocket.leave(room?.roomInfo?.roomId);
          targetSocket.emit("leaveRoomSuccess", roomAfterLeave);
          io.emit("listRooms", listRooms);
          io.to(roomAfterLeave?.roomInfo?.roomId).emit("currentRoom", {
            currentRoom: roomAfterLeave,
            roomMembers: roomMembers,
          });
          io.to(roomAfterLeave?.roomInfo?.roomId).emit("roomMembers", roomMembers);
        });
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
      io.to(data.roomId).emit("startBet", {
        gameId: data.roomId,
        totalBet: currentRoom.roomInfo?.roomBet,
        receiverId: process.env.BOT_ID,
        appId: process.env.APP_ID,
        currentGameId: currentRoom.currentGameId,
      });
    });
    socket.on("startRound", (data) => {
      const { roomId, userId, roundGame, roundId, currentTurn } = data;
      const currentRoom = getCurrentRoom(roomId);
      changeStatusOfMember(roomId, userId, "playing");
      currentRoom?.userWatchers?.forEach((watcher) => {
        const gameData = getGameMemberStatus(currentRoom?.roomInfo?.roomId);
        io.to(getSocketIdOfUser(watcher.userId)).emit("watchGame", gameData);
      });
      const currentRound = currentRoom.roundGames.find((round) => round.round === roundGame);
      const currentRoundGroup = currentRound.group;
      currentRound.currentTurn = currentTurn;

      if (currentRound.currentTurn > currentRoom.roomInfo?.roomRound / 2) {
        // calculate win count and lose count of user in current round
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

        // check if win count or lose count is greater than half of room round, end of round
        if (winCount >= currentRoom.roomInfo?.roomRound / 2 || loseCount >= currentRoom.roomInfo?.roomRound / 2) {
          // handle win round, if number of player is less than 2 and win count is greater than lose count, end of game
          // call endBet to increase money of winner by total bet of room and emit endBet to client
          if (currentRound.listPlayer.length <= 2 && winCount > loseCount) {
            const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
            io.to(roomId).emit("endOfGame", {
              roundGame,
              roundId,
              roomId,
              currentTurn: currentRound.currentTurn,
              isWinner: winCount > loseCount,
              winner: userId,
            });
            io.to(getSocketIdOfUser(currentRoom?.roomMember[0])).emit("sendBet", {
              gameId: roomId,
              totalBet: room.totalBet,
              receiverId: userId,
            });
            endBet(roomId, userId);
            getRewardFromBot(currentRoom.currentGameId, userId, room.totalBet).then((data) => {
              if (data.isSuccess) {
                socket.emit("endBet", {
                  totalBet: room.totalBet,
                });
              }
            });

            room.isPlaying = false;
            return;
          }

          // emit event endOfRound to client, change status of member to pending or lose
          // end of round if win count is greater than lose count, else user lose
          socket.emit("endOfRound", {
            roundGame,
            roundId,
            roomId,
            currentTurn: currentRound.currentTurn,
            isWinner: winCount > loseCount,
          });

          // change status of member to pending or lose when end of round
          changeStatusOfMember(roomId, userId, winCount > loseCount ? "pending" : "lose");
          currentRoom?.userWatchers?.forEach((watcher) => {
            const gameData = getGameMemberStatus(currentRoom?.roomInfo?.roomId);
            io.to(getSocketIdOfUser(watcher.userId)).emit("watchGame", gameData);
          });
          return;
        }

        // check if currentTurn is greater than room round, emit event endOfRound to client
        if (currentRound.currentTurn > currentRoom.roomInfo?.roomRound) {
          // handle draw round
          if (winCount === loseCount) {
            // start dice game if draw and current turn is less than room round + 3
            if (currentRound.currentTurn > +currentRoom.roomInfo?.roomRound + 1) {
              if (!group?.diceTurn) {
                group.diceTurn = {
                  player1: {
                    dice1: 0,
                    dice2: 0,
                    dice3: 0,
                    total: 0,
                    userId: group.player1,
                  },
                  player2: {
                    dice1: 0,
                    dice2: 0,
                    dice3: 0,
                    total: 0,
                    userId: group.player2,
                  },
                };
              }
              while (true) {
                const dice1 = Math.floor(1 + Math.random() * 6);
                const dice2 = Math.floor(1 + Math.random() * 6);
                const dice3 = Math.floor(1 + Math.random() * 6);
                const randomDice = {
                  dice1,
                  dice2,
                  dice3,
                  total: dice1 + dice2 + dice3,
                  userId,
                };
                userId === group.player1 ? (group.diceTurn.player1 = randomDice) : (group.diceTurn.player2 = randomDice);
                // check if total of dice is not equal, break loop
                // else continue loop to random dice again to avoid draw game
                if (
                  group.diceTurn.player1.total !== 0 &&
                  group.diceTurn.player2.total !== 0 &&
                  group.diceTurn.player1.total === group.diceTurn.player2.total
                ) {
                  continue;
                }
                break;
              }
              // emit event startDiceGame to client, start dice game to show start random dice
              socket.emit("startDiceGame");
              setTimeout(() => {
                // emit event endDiceGame to client, end dice game to show result of dice game
                socket.emit("endDiceGame", {
                  roomId,
                  roundGame,
                  roundId,
                  currentTurn: currentRound.currentTurn,
                  myDice: userId === group.player1 ? group.diceTurn.player1 : group.diceTurn.player2,
                  rivalDice: userId === group.player1 ? group.diceTurn.player2 : group.diceTurn.player1,
                });
              }, 2000);
              setTimeout(() => {
                // emit event endOfRound to client, end of round if draw and current turn is greater than room round + 3
                const winner = group.diceTurn.player1.total > group.diceTurn.player2.total ? group.player1 : group.player2;
                socket.emit("endOfRound", {
                  roundGame,
                  roundId,
                  roomId,
                  currentTurn: currentRound.currentTurn,
                  isWinner: winner === userId,
                });
                changeStatusOfMember(roomId, userId, winner === userId ? "pending" : "lose");

                currentRoom?.userWatchers?.forEach((watcher) => {
                  const gameData = getGameMemberStatus(currentRoom?.roomInfo?.roomId);
                  io.to(getSocketIdOfUser(watcher.userId)).emit("watchGame", gameData);
                });
              }, 10000);
              return;
            }

            // create new turn if draw and current turn is less than room round + 3
            group.result.push({
              turn: group.result.length + 1,
              player1Choice: null,
              player2Choice: null,
              winner: null,
            });

            // emit event startTurn to client, start new turn if draw and current turn is less than room round + 3
            socket.emit("startTurn", {
              currentRoom,
              yourInfo: getUserInfo(userId),
              rivalInfo: getUserInfo(group.player1 === userId ? group.player2 : group.player1),
              roomInfo: currentRoom.roomInfo,
              currentTurn: currentRound.currentTurn,
            });
            const roomStatus = currentRoom.memberStatus.find((member) => member.userId === userId);
            roomStatus.currentTurn = currentTurn;

            currentRoom?.userWatchers?.forEach((watcher) => {
              const gameOfMember = getGameOfMember(roomId, watcher.targetId);
              io.to(getSocketIdOfUser(watcher.userId)).emit("watchGameOfUser", gameOfMember);
            });

            // after 10 second, emit event submitTurnNow to get choice of user in new turn
            setTimeout(() => {
              socket.emit("submitTurnNow", {
                roomId,
                roundGame,
                roundId,
                currentTurn: currentRound.currentTurn,
              });
            }, 10000);
            return;
          }

          // if not draw, end of round or end of game
          // check if number of player is less than 2 and win count is greater than lose count, end of game
          if (currentRound.listPlayer.length <= 2 && winCount > loseCount) {
            const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);

            // emit event endOfGame to winner and endBet to increase money of winner by total bet of room
            io.to(roomId).emit("endOfGame", {
              roundGame,
              roundId,
              roomId,
              currentTurn: currentRound.currentTurn,
              isWinner: winCount > loseCount,
              winner: userId,
            });
            endBet(roomId, userId);
            getRewardFromBot(currentRoom.currentGameId, userId, room.totalBet).then((data) => {
              if (data.isSuccess) {
                socket.emit("endBet", {
                  totalBet: room.totalBet,
                });
              }
            });
            room.isPlaying = false;
            return;
          }

          // emit event endOfRound to client, end of round if win count is greater than lose count, else user lose
          // if user is winner, change status of member to pending, else change status to lose
          socket.emit("endOfRound", {
            roundGame,
            roundId,
            roomId,
            currentTurn: currentRound.currentTurn,
            isWinner: winCount > loseCount,
          });
          changeStatusOfMember(roomId, userId, winCount > loseCount ? "pending" : "lose");
          currentRoom?.userWatchers?.forEach((watcher) => {
            const gameData = getGameMemberStatus(currentRoom?.roomInfo?.roomId);
            io.to(getSocketIdOfUser(watcher.userId)).emit("watchGame", gameData);
          });
          return;
        }
      }

      // loop to start one turn of game, emit event startTurn to client to show start turn
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
          const roomStatus = currentRoom.memberStatus.find((member) => member.userId === userId);
          roomStatus.currentTurn = currentTurn;
          currentRoom?.userWatchers?.forEach((watcher) => {
            const gameOfMember = getGameOfMember(roomId, watcher.targetId);
            io.to(getSocketIdOfUser(watcher.userId)).emit("watchGameOfUser", gameOfMember);
          });
        }
      }

      // after 10 second, emit event submitTurnNow to get choice of user in turn
      setTimeout(() => {
        socket.emit("submitTurnNow", {
          roomId,
          roundGame,
          roundId,
          currentTurn: currentRound.currentTurn,
        });
      }, 10000);
    });

    // when user win one round, client will emit event continueJoin to continue join next round
    // user lose will not emit this event
    socket.on("continueJoin", (data) => {
      const { roomId, userId, roundGame } = data;
      const currentRoom = getCurrentRoom(roomId);
      const currentRound = currentRoom.roundGames.find((round) => round.round === roundGame);
      // init new round if it not exist
      if (!currentRound) {
        currentRoom.roundGames.push({
          roundId: makeid(6),
          round: roundGame,
          listPlayer: [],
          group: [],
          currentTurn: 1,
        });
      }

      // add user to list player of round and join room of round and join to socket room of round
      const currentRoundNew = currentRoom.roundGames.find((round) => round.round === roundGame);
      currentRoundNew.listPlayer.push(userId);
      socket.join(currentRoundNew.roundId);

      // emit event continueJoinSuccess to client to continue join next round,
      socket.emit("continueJoinSuccess", {
        roomId,
        roundGame,
        roundId: currentRoundNew.roundId,
        currentTurn: currentRoundNew.currentTurn,
      });
    });

    // when user join next round success, client will emit event combindNextRound to start next round to continue gmae
    socket.on("combindNextRound", (data) => {
      const { roomId, userId, roundGame, roundId } = data;
      const currentRoom = getCurrentRoom(roomId);
      const currentRound = currentRoom.roundGames?.find(
        (round) => round.round === roundGame || round.round === data.currentRound
      );

      // check if total player of current round is equal to ...to start nwe round
      if (currentRound.listPlayer.length === currentRoom.roomInfo?.roomMaxUser / 2 ** (currentRound.round - 1)) {
        if (currentRound.listPlayer.length === 1) {
          const room = listRooms?.find((room) => room.roomInfo?.roomId === roomId);
          io.to(roomId).emit("endOfGame", {
            roundGame,
            roundId,
            roomId,
            currentTurn: currentRound.currentTurn,
            winner: userId,
          });
          endBet(roomId, userId);
          getRewardFromBot(currentRoom.currentGameId, userId, room.totalBet).then((data) => {
            if (data.isSuccess) {
              socket.emit("endBet", {
                totalBet: room.totalBet,
              });
            }
          });
          room.isPlaying = false;
          return;
        }
        for (let i = 0; i < currentRound.listPlayer?.length / 2; i++) {
          const turnCount = currentRoom.roomInfo?.roomRound;
          const turnResult = [];
          const player1 = currentRound.listPlayer[i];
          const player2 = currentRound.listPlayer[currentRound.listPlayer.length - i - 1];
          for (let j = 0; j < turnCount; j++) {
            turnResult.push({
              turn: j + 1,
              player1Choice: null,
              player2Choice: null,
              winner: null,
            });
          }
          currentRound.group.push({
            groupId: makeid(6),
            player1,
            player2,
            result: [...turnResult],
          });
          const roomStatus = currentRoom.memberStatus?.find((member) => member.userId === player1);
          roomStatus.rivalInfo = getUserInfo(player2);
          roomStatus.result = [];
          roomStatus.currentTurn = 1;
          const roomStatusRival = currentRoom.memberStatus?.find((member) => member.userId === player2);
          roomStatusRival.rivalInfo = getUserInfo(player1);
          roomStatusRival.result = [];
          roomStatusRival.currentTurn = 1;
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

      const roomStatus = currentRoom.memberStatus.find((member) => member.userId === userId);
      roomStatus.currentTurn = currentTurn;
      const currentTurnStatus = roomStatus.result?.find((result) => result.turn === currentTurn);
      if (!currentTurnStatus) {
        roomStatus.result.push({
          turn: currentTurn,
          player1Choice:
            group.player1 === userId
              ? group.result[currentTurn - 1]?.player1Choice
              : group.result[currentTurn - 1]?.player2Choice,
          player2Choice:
            group.player1 === userId
              ? group.result[currentTurn - 1]?.player2Choice
              : group.result[currentTurn - 1]?.player1Choice,
          winner: checkResult,
        });
      }
      currentRoom?.userWatchers?.forEach((watcher) => {
        const gameOfMember = getGameOfMember(roomId, watcher.targetId);
        io.to(getSocketIdOfUser(watcher.userId)).emit("watchGameOfUser", gameOfMember);
      });
    });

    socket.on("getWatchGame", (data) => {
      const userBySocketId = getUserBySocketId(socket.id);
      const currentRoom = getCurrentRoomOfUser(socket.id);
      const checkUserInListWatchers = currentRoom?.userWatchers?.find((watcher) => watcher.userId === userBySocketId?.userId);
      if (!checkUserInListWatchers) {
        currentRoom?.userWatchers.push({
          userId: userBySocketId?.userId,
          targetId: currentRoom.roomMember[0],
        });
      }
      const gameData = getGameMemberStatus(currentRoom?.roomInfo?.roomId);
      socket.emit("watchGame", gameData);
    });

    socket.on("watchGameOfUser", (targetId) => {
      const userBySocketId = getUserBySocketId(socket.id);
      const currentRoom = getCurrentRoomOfUser(socket.id);
      const checkUserInListWatchers = currentRoom?.userWatchers?.find((watcher) => watcher.userId === userBySocketId?.userId);
      if (!checkUserInListWatchers) {
        currentRoom?.userWatchers.push({
          userId: userBySocketId?.userId,
          targetId: data.targetId,
        });
      }
      checkUserInListWatchers.targetId = targetId;
      const gameOfMember = getGameOfMember(currentRoom?.roomInfo?.roomId, targetId);
      socket.emit("watchGameOfUser", gameOfMember);
    });

    // Khi client ngắt kết nối
    socket.on("disconnect", () => {
      const roomOfUserWithSocketId = getCurrentRoomOfUser(socket.id);
      disconnectUser(socket.id);

      if (roomOfUserWithSocketId) {
        roomOfUserWithSocketId.roomInfo.owner = roomOfUserWithSocketId.roomMember[0];
        const roomMembers = getRoomMembers(roomOfUserWithSocketId.roomInfo?.roomId);
        socket.to(roomOfUserWithSocketId.roomInfo?.roomId).emit("currentRoom", {
          currentRoom: roomOfUserWithSocketId,
          roomMembers: roomMembers,
        });
        socket.to(roomOfUserWithSocketId.roomInfo?.roomId).emit("roomMembers", roomMembers);
      }
      io.emit("listUsers", connectedUsers);
    });
  });
};

setupSocketServer(server);
