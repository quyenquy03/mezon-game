let d1,
  d2,
  d3,
  player1DiceElement,
  player2DiceElement,
  roll,
  time,
  p1dice1,
  p1dice2,
  p1dice3,
  p2dice1,
  p2dice2,
  p2dice3,
  endGameAction,
  listChoice,
  modalShowGame,
  modalStartRound,
  listMemberStream;

// load modal-create-room.html
fetch("./components/modal-create-room.html")
  .then((response) => {
    if (!response.ok) throw new Error("Không thể tải file");
    return response.text();
  })
  .then((data) => {
    document.getElementById("modal-create-room-root").innerHTML = data;
  })
  .catch((error) => console.error("Lỗi:", error));

// load modal-search-room.html
fetch("./components/modal-search-room.html")
  .then((response) => {
    if (!response.ok) throw new Error("Không thể tải file");
    return response.text();
  })
  .then((data) => {
    document.getElementById("modal-search-room-root").innerHTML = data;
  })
  .catch((error) => console.error("Lỗi:", error));

// Load modal-show-game.html
fetch("./components/modal-show-game.html")
  .then((response) => {
    if (!response.ok) throw new Error("Không thể tải file");
    return response.text();
  })
  .then((data) => {
    document.getElementById("modal-show-game-root").innerHTML = data;
  })
  .catch((error) => console.error("Lỗi:", error));

// load modal-start-round.html
fetch("./components/modal-start-round.html")
  .then((response) => {
    if (!response.ok) throw new Error("Không thể tải file");
    return response.text();
  })
  .then((data) => {
    document.getElementById("modal-start-round-root").innerHTML = data;
    d1 = document.getElementById("dice1");
    d2 = document.getElementById("dice2");
    d3 = document.getElementById("dice3");
    player1DiceElement = document.querySelector(".player1-dice");
    player2DiceElement = document.querySelector(".player2-dice");
    roll = document.getElementById("roll");
    time = document.getElementById("countdown-time");

    p1dice1 = document.getElementById("p1-dice1");
    p1dice2 = document.getElementById("p1-dice2");
    p1dice3 = document.getElementById("p1-dice3");

    p2dice1 = document.getElementById("p2-dice1");
    p2dice2 = document.getElementById("p2-dice2");
    p2dice3 = document.getElementById("p2-dice3");

    endGameAction = document.getElementById("end-game-action");
    listChoice = document.getElementById("list-choice");
    modalShowGame = document.getElementById("modal-show-game");
    modalStartRound = document.getElementById("modal-start-round");
    listMemberStream = document.getElementById("list-member-stream");
  })
  .catch((error) => console.error("Lỗi:", error));
