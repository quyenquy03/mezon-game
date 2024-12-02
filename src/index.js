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
      roomRound: 5,
    },
    roomMember: [],
    currentRoundMembers: [],
    currentRoundGroup: [],
    currentRound: 1,
    isPlaying: false,
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
      roomRound: 5,
    },
    roomMember: [],
    currentRoundMembers: [],
    roundGames: [
      {
        round: 1,
        listPlayer: ["1234", "1273"],
        group: [
          {
            groupId: 1,
            player1: 1234,
            player2: 5678,
            result: [
              {
                turnId: 1,
                player1Choice: "rock",
                player2Choice: "scissors",
                winner: 1234,
              },
              {
                turnId: 2,
                player1Choice: "rock",
                player2Choice: "scissors",
                winner: 1234,
              },
              {
                turnId: 3,
                player1Choice: "rock",
                player2Choice: "scissors",
                winner: 1234,
              },
            ],
          },
        ],
      },
    ],
    currentRound: 1,
    isPlaying: false,
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
    currentRoundGroup: [],
    currentRound: 1,
    isPlaying: false,
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

const refreshGroupOfRoom = (roomId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  room.currentRoundGroup = room.currentRoundGroup.map((group) => {
    group.player1.choices = "";
    group.player2.choices = "";
    return group;
  });
};

const startNewGame = (roomId) => {
  const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
  room.currentRoundMembers = room.roomMember;
  room.currentRound = 1;
  room.isPlaying = true;
  room.roundGames = [];
  const listGroup = [];
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
  };
  room.roundGames.push(newRound);
};

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

    socket.on("startNewGame", (data) => {
      if (!checkMemberBeforeStartGame(data.roomId)) {
        socket.emit("startGameError", "Số lượng người chơi chưa đủ để bắt đầu!");
        return;
      }
      startNewGame(data.roomId);
    });

    // start game
    // socket.on("startGame", (data) => {
    //   if (!checkMemberBeforeStartGame(data.roomId)) {
    //     socket.emit("startGameError", "Số lượng người chơi chưa đủ để bắt đầu!");
    //     return;
    //   }
    //   startNewGame(data.roomId);
    //   const currentRoom = getCurrentRoom(data.roomId);
    //   currentRoom.currentRoundGroup = [];

    //   for (let i = 0; i < currentRoom.currentRoundMembers.length / 2; i++) {
    //     const team1 = currentRoom.currentRoundMembers[i];
    //     const team2 = currentRoom.currentRoundMembers[currentRoom.currentRoundMembers.length - i - 1];

    //     currentRoom.currentRoundGroup.push({
    //       player1: {
    //         userId: team1,
    //         choices: "",
    //       },
    //       player2: {
    //         userId: team2,
    //         choices: "",
    //       },
    //       player1Wins: 0,
    //       player2Wins: 0,
    //     });

    //     io.to(getSocketIdOfUser(team1)).emit("startRoundGame", {
    //       yourInfo: getUserInfo(team1),
    //       rivalInfo: getUserInfo(team2),
    //       roomInfo: currentRoom,
    //     });
    //     io.to(getSocketIdOfUser(team2)).emit("startRoundGame", {
    //       yourInfo: getUserInfo(team2),
    //       rivalInfo: getUserInfo(team1),
    //       roomInfo: currentRoom,
    //     });
    //   }
    // });

    // socket.on("endOneRoundGame", (data) => {
    //   const { roomId, userId, choice } = data;

    //   const currentRoom = getCurrentRoom(roomId);
    //   currentRoom.currentRoundGroup = currentRoom.currentRoundGroup.map((group) => {
    //     if (group.player1.userId === userId) {
    //       group.player1.choices = choice;
    //     }
    //     if (group.player2.userId === userId) {
    //       group.player2.choices = choice;
    //     }
    //     if (group.player1.choices && group.player2.choices) {
    //       const winner = checkResultOfOneGame(
    //         group.player1.userId,
    //         group.player2.userId,
    //         group.player1.choices,
    //         group.player2.choices
    //       );
    //       if (winner === group.player1.userId) {
    //         group.player1Wins++;
    //       }
    //       if (winner === group.player2.userId) {
    //         group.player2Wins++;
    //       }

    //       io.to(getSocketIdOfUser()).emit("startRoundGame", {
    //         yourInfo: getUserInfo(userId),
    //         rivalInfo: getUserInfo(),
    //         roomInfo: currentRoom,
    //       });
    //     }
    //     return group;
    //   });
    // });

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
