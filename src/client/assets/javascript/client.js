let choices = {};
let maxRounds = 0;
let winnerArea = document.getElementById('winnerArea');
let player1Choice = document.querySelector('.player1-choice');
let player2Choice = document.querySelector('.player2-choice');
let buttonChoices = document.querySelectorAll('.btn-choice');
let gameId;
let player1;
let player2;
let roomMembers;
function navigateTo(pageId) {
  document.querySelectorAll(".content").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

const socket = io();

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

const randomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateUser = () => {
  const userId = randomNumber(1000, 9999) + "";
  return {
    userId: userId,
    name: "User " + userId,
    avatar: "https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg",
  };
};
const user = generateUser();
const fetchUser = () => {
  setTimeout(() => {
    socket.emit("userInfo", user);
  }, 1000);
};
fetchUser();

const createNewRoom = () => {
  const roomName = document.getElementById("room-name")?.value;
  const roomMaxUser = document.getElementById("room-max-user")?.value;
  const roomPassword = document.getElementById("room-password")?.value;
  const roomUsePassword = document.getElementById("room-use-password").checked;
  const roomBet = document.getElementById("room-bet")?.value;
  const roomRound = document.getElementById("room-round")?.value;

  socket.emit("createRoom", {
    roomId: randomNumber(100000, 999999) + "",
    roomName,
    roomMaxUser: +roomMaxUser,
    roomPassword,
    roomUsePassword,
    roomBet,
    owner: user.userId,
    roomRound,
  });
};

socket.on("roomCreated", (roomInfo) => {
  navigateTo("room-content");
  socket.emit("joinRoom", {
    roomId: roomInfo.roomId,
    userId: user.userId,
  });
  const modalCreateRoom = document.getElementById("modal-create-room");
  const modal = bootstrap.Modal.getInstance(modalCreateRoom);
  modal.hide();
});

const renderListRoom = (listRooms) => {
  const listRoomElement = document.querySelector(".room-list");
  listRoomElement.innerHTML = "";
  listRooms.forEach((room) => {
    const roomElement = document.createElement("div");
    roomElement.classList.add("col", "col-12", "col-md-6", "col-xl-4", "col-xxl-3");
    roomElement.innerHTML = `
      <div class="room-item">
              <div class="room-name">
                <span class="room-name-text">${room?.roomInfo?.roomId}</span>
              </div>
              <div class="room-join">
                <button onclick="joinRoom('${room?.roomInfo?.roomId}')" class="room-join-btn">JOIN</button>
              </div>
              <div class="room-bet">
                <img class="room-bet-bg" src="./assets/images/bg-cuoc.png" alt="" />
                <div class="room-bet-info">
                  <span class="room-bet-text">${room?.roomInfo?.roomBet}</span>
                  <img class="room-bet-coin" src="./assets/images/coin.png" alt="" />
                </div>
              </div>
              <div class="room-owner">
                <img class="room-owner-icon" src="./assets/images/user.png" alt="" />
                <span class="room-owner-name">username</span>
              </div>
            </div>
    `;
    listRoomElement.appendChild(roomElement);
  });
};

const joinRoom = (roomId) => {
  socket.emit("joinRoom", {
    roomId,
    userId: user.userId,
  });
};
socket.on("joinRoomSuccess", (roomInfo) => {
  navigateTo("room-content");
  roomId = roomInfo.roomId;
});
socket.on("joinRoomError", (message) => {
  alert(message);
});

socket.emit("listRooms");
socket.on("listRooms", (rooms) => {
  renderListRoom(rooms);
  console.log("List rooms:", rooms);
});

const renderCurrentRoomInfo = (roomInfo) => {
  const roomMemberElement = document.querySelector(".game-members");
  roomMemberElement.innerHTML = "";
  const maxMember = roomInfo.roomInfo.roomMaxUser;

  Array.from({ length: maxMember }).forEach((_, index) => {
    const memberElement = document.createElement("div");
    memberElement.classList.add("game-member-item");
    memberElement.innerHTML = `
      <img class='member-avatar' src="https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg" alt="">
      <span class='member-name'>Waiting...</span>
    `;
    roomMemberElement.appendChild(memberElement);
  });

  const startGameButtonElement = document.querySelector(".btn-start-game");
  startGameButtonElement.addEventListener("click", () => {
    startGame(user.userId, roomInfo.roomInfo.roomId);
  });
};
socket.on("currentRoom", (roomInfo) => {
  renderCurrentRoomInfo(roomInfo);
});

const renderRoomMembers = (members) => {
  const gameMemberItems = document.querySelectorAll(".game-member-item");
  members.forEach((member, index) => {
    const memberElement = gameMemberItems[index];
    if (!memberElement) {
      return;
    }
    memberElement.innerHTML = `
      <img class='member-avatar' src="https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg" alt="">
      <span class='member-name'>${member?.name}</span>
    `;
  });
};
socket.on("roomMembers", (members) => {
  roomMembers = members;
  renderRoomMembers(members);
  console.log("Room members:", roomMembers);
});

const renderListUser = (listUsers) => {
  const listUserElement = document.querySelector(".user-list");
  listUserElement.innerHTML = "";
  listUsers.forEach((user) => {
    const userElement = document.createElement("div");
    userElement.classList.add("user-item");
    userElement.innerHTML = `
      <div class="user-avatar">
        <img src="${user.avatar}" alt="${user.name}" />
      </div>
      <div class="user-info">
        <span class="user-name">${user.name}</span>
      </div>
    `;
    listUserElement.appendChild(userElement);
  });
};

socket.emit("listUsers");
socket.on("listUsers", (users) => {
  renderListUser(users);
  // console.log("List users:", users);
});

const renderUserInfo = (userInfo) => {
  const userInfoElement = document.querySelector(".account-box");

  if (!userInfoElement) {
    console.error("Element with class 'account-box' not found.");
    return;
  }

  userInfoElement.innerHTML = `
    <div class="avatar">
      <img src="${userInfo.avatar}" alt="${userInfo.name}" />
    </div>
    <div class="name">
      <span class="user-name">${userInfo.name}</span>
    </div>
  `;
};
renderUserInfo(user);

// start game
const startGame = (userId, roomId) => {
  socket.emit("startGame", {
    userId,
    roomId,
  });
};
socket.on("startGameError", (message) => {
  alert(message);
});

const renderCurrentRoundInfo = (roundInfo) => {
  const headerGameLeftElement = document.querySelector(".header-game-left");
  const headerGameRightElement = document.querySelector(".header-game-right");

  let listStar = Array.from({ length: roundInfo.roomInfo?.roomInfo?.roomRound }).map((_, index) => {
    return `<span>&#9733;</span>`;
  });
  listStar.join("");

  headerGameLeftElement.innerHTML = `
    <div class='game-user game-user-left'>
      <img class='game-user-avatar' src="${roundInfo.yourInfo?.avatar}" alt="">
      <div class='game-user-info'>
        <div class='game-user-name'>${roundInfo.yourInfo?.name}</div>
        <div class='game-user-score'>
          ${listStar.join("")}
        </div>
      </div>
    </div>
  `;

  headerGameRightElement.innerHTML = `
    <div class='game-user game-user-right'>
      <img class='game-user-avatar' src="${roundInfo.rivalInfo?.avatar}" alt="">
      <div class='game-user-info'>
        <div class='game-user-name'>${roundInfo.rivalInfo?.name}</div>
        <div class='game-user-score'>
          ${listStar.join("")}
        </div>
      </div>
    </div>
  `;
};
socket.on("startRoundGame", (data) => {
  renderCurrentRoundInfo(data);
  const modalElement = document.getElementById("modal-start-round");
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
  startCountdown();
  player1 = data.yourInfo;
  player2 = data.rivalInfo;
  roomId = data.roomUniqueId.roomInfo.roomId;
  gameId = data.gameId;
  socket.emit('createGame', { roomUniqueId: data.roomUniqueId, player1: data.yourInfo, player2: data.rivalInfo, gameId: gameId })
});

socket.on("playGame", (data) => {
  player1Choice.src = './assets/images/rock-paper-scissors.png';
  player2Choice.src = './assets/images/rock-paper-scissors.png';
  choices = {};
  winnerArea.innerHTML = '';
  startCountdown();
});
let filteredUsers = [];
socket.on("result", (data) => {
  let requiredStreak = data.maxRounds / 2;
  player1Choice.src = `./assets/images/${choices.p1 || 'rock-paper-scissors'}.png`;
  player2Choice.src = `./assets/images/${choices.p2 || 'rock-paper-scissors'}.png`;
  switch (data.winner) {
    case 'p1':
      winnerArea.innerHTML = `${data.nameWinner} win`;
      break;
    case 'p2':
      winnerArea.innerHTML = `${data.nameWinner} win`;
      break;
    default:
      winnerArea.innerHTML = `It's a draw`;
      break;
  }
  const handleGameOver = (data) => {
    switch (data.winner) {
      case 'p1':
        message = `Game Over! ${data.nameWinner} is the overall winner!`;
        break;
      case 'p2':
        message = `Game Over! ${data.nameWinner} is the overall winner!`;
        break;
      default:
        message = `Game Over! It's a draw.`;
        break;
    }
    // alert(message);
    buttonChoices.forEach(button => {
      button.setAttribute('disabled', true);
    });
    console.log(data.winnerId);
    
    socket.emit("handleWinner", {winnerId: data.winnerId, user: data.nameWinner, roomId: data.roomId});
  };

  if (data.rounds == data.maxRounds || data.p1Wins > requiredStreak || data.p2Wins > requiredStreak) {
    socket.on("gameOver", handleGameOver);
  } else if (data.rounds < data.maxRounds) {
    setTimeout(() => {
      console.log('next round');
      socket.emit("nextRound", { roomUniqueId: gameId, rounds: data.rounds });
    }, 3000);
  }
});


socket.on("playGame", (data) => {
  const round = document.querySelector(".round");
  round.innerHTML = `ROUND ${data.round + 1}`;
  player1Choice.src = './assets/images/rock-paper-scissors.png';
  player2Choice.src = './assets/images/rock-paper-scissors.png';
  choices = {};
  winnerArea.innerHTML = '';
  round.innerHTML = `ROUND ${data.round + 1}`;
  startCountdown();
});

function startCountdown() {
  let countdown = 9;
  const countdownArea = document.getElementById('countdownArea');
  countdownArea.style.display = 'block';
  var countdownInterval = setInterval(() => {
    countdownArea.innerHTML = `0${countdown}`;
    countdown--;

    if (choices.p1 && choices.p2) {
      console.log('Stopping interval by f');
      clearInterval(countdownInterval);
      countdownArea.innerHTML = `00`;
    }

    if (countdown < 0) {
      console.log('Stopping interval');
      clearInterval(countdownInterval);
      countdownArea.innerHTML = `00`;
    }
  }, 1000);
}

function sendChoice(rpsValue) {
  console.log('gameId', gameId);
  
  choices[player1 ? 'p1' : 'p2'] = rpsValue;
  socket.emit('player', {
    rpsValue: rpsValue,
    gameId: gameId,
    player: player1.userId,
  });
}

socket.on("player2", (data) => {
  if (player2.userId == data.data.player) {
    choices.p2 = data.data.rpsValue;
  }
});

// socket.on("player2", (data) => {
//   if (player2.userId == data.data.player) {
//     choices.p2 = data.data.rpsValue;
//   }
// });