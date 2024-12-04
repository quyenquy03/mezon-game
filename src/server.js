import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { setupSocketServer} from "./socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "home.html"));
});

app.get("/game", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "game.html"));
});

const server = app.listen(3000, () => {
  console.log("Server listening on http://localhost:3000");
});

setupSocketServer(server);