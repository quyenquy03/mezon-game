import express from "express";
import cors from "cors";
var app = express();
app.use(cors());
app.use(express.json());
app.get("/", function (req, res) {
  res.send("Hello World! " + Date.now());
});
app.listen(3000, function () {
  console.log("Example app listening on port 3000 with domain http://localhost:3000");
});
