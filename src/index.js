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

app.get("/game", function (req, res) {
  res.sendFile(path.join(__dirname, "client", "game.html"));
});

const server = app.listen(3000, function () {
  console.log("Example app listening on port 3000 with domain http://localhost:3000");
});

const room = {};
let maxRounds = 0;
let players = [];
let maxPlayers = 0;
const io = new SocketServer(server, {
  cors: {
    // origin: [ENV.ORIGIN],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on('createGame', (data) => {
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
      maxRounds: maxRounds
    });
  });


  socket.on('joinGame', (data) => {
    if (room[data.roomUniqueId] != null) {
      socket.join(data.roomUniqueId);
      socket.to(data.roomUniqueId).emit("playersConnected", {});
      socket.emit("playersConnected");
      // socket.to(data.roomUniqueId).emit("playGame", {});
      // socket.emit("playGame");
      if (players.length < maxPlayers) {
        players.push({namePlayer: data.namePlayer, eliminated: false});
      } else {
        socket.emit("fullRoom");
      }
    }
  })

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

  socket.on('nextRound', (data) => {
    const room = data.roomUniqueId; // Replace with your room tracking logic
    if (room) {
      if (data.rounds < maxRounds) {
        console.log('da vao day');
        io.to(room).emit('playGame', { round: room.rounds });
      } 
    }
  });
});

function determineWinner(roomUniqueId) {
  let p1Choice = room[roomUniqueId].p1Choice;
  let p2Choice = room[roomUniqueId].p2Choice;
  let winner = null;
  console.log('p1Choice: ', p1Choice);
  console.log('p2Choice: ', p2Choice);
  console.log('room: ', room);
  
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
    winner = (p2Choice == "Scissors") ? "p2" : "p1";
  } else if (p1Choice == "Rock") {
    winner = (p2Choice == "Paper") ? "p2" : "p1";
  } else if (p1Choice == "Scissors") {
    winner = (p2Choice == "Rock") ? "p2" : "p1";
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
    p2Wins: room[roomUniqueId].p2Wins
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
    rounds: room[roomUniqueId].rounds
  });

  // Xóa dữ liệu phòng khi game kết thúc (nếu cần)
  delete room[roomUniqueId];
}

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

io.to("room").emit()
