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

  socket.on('createGame', () => {
    const roomUniqueId = makeid(6);
    rooms[roomUniqueId] = {};
    socket.join(roomUniqueId);
    socket.emit("newGame", { roomUniqueId: roomUniqueId })
  });

  socket.on('joinGame', (data) => {
    if (rooms[data.roomUniqueId] != null) {
      socket.join(data.roomUniqueId);
      socket.to(data.roomUniqueId).emit("playersConnected", {});
      socket.emit("playersConnected");
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
});

function declareWinner(roomUniqueId) {
  let p1Choice = rooms[roomUniqueId].p1Choice;
  let p2Choice = rooms[roomUniqueId].p2Choice;
  let winner = null;
  if (p1Choice === p2Choice) {
      winner = "d";
  } else if (p1Choice == "Paper") {
      if (p2Choice == "Scissor") {
          winner = "p2";
      } else {
          winner = "p1";
      }
  } else if (p1Choice == "Rock") {
      if (p2Choice == "Paper") {
          winner = "p2";
      } else {
          winner = "p1";
      }
  } else if (p1Choice == "Scissor") {
      if (p2Choice == "Rock") {
          winner = "p2";
      } else {
          winner = "p1";
      }
  }
  io.sockets.to(roomUniqueId).emit("result", {
      winner: winner
  });
  rooms[roomUniqueId].p1Choice = null;
  rooms[roomUniqueId].p2Choice = null;
}

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

io.to("room").emit()
