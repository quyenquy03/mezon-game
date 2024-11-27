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

const rooms = {};
let rounds = 3;
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
    const maxRounds = data.maxRounds || 5;
    rooms[roomUniqueId] = {
      p1Choice: null,
      p2Choice: null,
      rounds: 0, // Số lượt chơi hiện tại
      maxRounds: maxRounds, // Số lượt chơi tối đa
      p1Wins: 0, // Số lượt thắng của player 1
      p2Wins: 0, // Số lượt thắng của player 2
      p1Streak: 0, // Chuỗi thắng liên tiếp của player 1
      p2Streak: 0, // Chuỗi thắng liên tiếp của player 2
    };

    socket.join(roomUniqueId);
    socket.emit("newGame", {
      roomUniqueId: roomUniqueId,
      maxRounds: maxRounds
    });
  });


  socket.on('joinGame', (data) => {
    if (rooms[data.roomUniqueId] != null) {
      socket.join(data.roomUniqueId);
      socket.to(data.roomUniqueId).emit("playersConnected", {});
      socket.emit("playersConnected");
      socket.emit("playGame");
    }
  })

  socket.on("p1Choice", (data) => {
    let rpsValue = data.rpsValue;
    rooms[data.roomUniqueId].p1Choice = rpsValue;
    socket.to(data.roomUniqueId).emit("p1Choice", { rpsValue: data.rpsValue });
    if (rooms[data.roomUniqueId].p2Choice != null) {
      declareWinner(data.roomUniqueId);
    }
  });

  socket.on("p2Choice", (data) => {
    let rpsValue = data.rpsValue;
    rooms[data.roomUniqueId].p2Choice = rpsValue;
    socket.to(data.roomUniqueId).emit("p2Choice", { rpsValue: data.rpsValue });
    if (rooms[data.roomUniqueId].p1Choice != null) {
      declareWinner(data.roomUniqueId);
    }
  });

  socket.on('nextRound', ({ roomUniqueId }) => {
    const room = rooms[roomUniqueId]; // Replace with your room tracking logic
    if (room) {
      room.rounds++;
      if (room.rounds <= room.maxRounds) {
        io.to(roomUniqueId).emit('newGame', { round: room.rounds });
      } else {
        const winner = room.p1Wins > room.p2Wins ? 'p1' : (room.p1Wins < room.p2Wins ? 'p2' : 'd');
        io.to(roomUniqueId).emit('gameOver', { winner, p1Wins: room.p1Wins, p2Wins: room.p2Wins, rounds: room.maxRounds });
      }
    }
  });
});

function declareWinner(roomUniqueId) {
  determineWinner(roomUniqueId); // Xác định kết quả khi hết thời gian
}

function determineWinner(roomUniqueId) {
  let p1Choice = rooms[roomUniqueId].p1Choice;
  let p2Choice = rooms[roomUniqueId].p2Choice;
  let winner = null;

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
    winner = (p2Choice == "Scissor") ? "p2" : "p1";
  } else if (p1Choice == "Rock") {
    winner = (p2Choice == "Paper") ? "p2" : "p1";
  } else if (p1Choice == "Scissor") {
    winner = (p2Choice == "Rock") ? "p2" : "p1";
  }

  // Cập nhật số lượt thắng và chuỗi thắng
  if (winner === "p1") {
    rooms[roomUniqueId].p1Wins++;
    rooms[roomUniqueId].p1Streak++;
    rooms[roomUniqueId].p2Streak = 0;
  } else if (winner === "p2") {
    rooms[roomUniqueId].p2Wins++;
    rooms[roomUniqueId].p2Streak++;
    rooms[roomUniqueId].p1Streak = 0;
  }

  // Tăng số lượt chơi
  rooms[roomUniqueId].rounds++;

  // Kiểm tra thắng liên tiếp
  const requiredStreak = Math.ceil(rooms[roomUniqueId].maxRounds / 2);
  if (rooms[roomUniqueId].p1Streak >= requiredStreak) {
    endGame(roomUniqueId, "p1");
    return;
  }
  if (rooms[roomUniqueId].p2Streak >= requiredStreak) {
    endGame(roomUniqueId, "p2");
    return;
  }

  // Kiểm tra kết thúc game khi hết round
  if (rooms[roomUniqueId].rounds >= rooms[roomUniqueId].maxRounds) {
    const finalWinner =
      rooms[roomUniqueId].p1Wins > rooms[roomUniqueId].p2Wins
        ? "p1"
        : rooms[roomUniqueId].p2Wins > rooms[roomUniqueId].p1Wins
          ? "p2"
          : "d"; // Hòa nếu số lượt thắng bằng nhau
    endGame(roomUniqueId, finalWinner);
    return;
  }

  // Gửi kết quả của lượt chơi
  io.sockets.to(roomUniqueId).emit("result", {
    winner: winner,
    rounds: rooms[roomUniqueId].rounds,
    p1Wins: rooms[roomUniqueId].p1Wins,
    p2Wins: rooms[roomUniqueId].p2Wins
  });

  // Thông báo chuyển sang round mới sau 5 giây
  // roundTransitionTimeout = setTimeout(() => {
  if (rooms[roomUniqueId].rounds < rooms[roomUniqueId].maxRounds) {
    // Reset lựa chọn cho round mới
    rooms[roomUniqueId].p1Choice = null;
    rooms[roomUniqueId].p2Choice = null;
    io.sockets.to(roomUniqueId).emit("startNewRound", {
      message: `Round ${rooms[roomUniqueId].rounds + 1} starting in 5 seconds...`
    });
    declareWinner(roomUniqueId);
  }
  // }, 5000); // Chờ 5 giây sau khi công bố kết quả để chuyển sang round mới
}

function endGame(roomUniqueId, finalWinner) {
  io.sockets.to(roomUniqueId).emit("gameOver", {
    winner: finalWinner,
    p1Wins: rooms[roomUniqueId].p1Wins,
    p2Wins: rooms[roomUniqueId].p2Wins,
    rounds: rooms[roomUniqueId].rounds
  });

  // Xóa dữ liệu phòng khi game kết thúc (nếu cần)
  // delete rooms[roomUniqueId];
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
