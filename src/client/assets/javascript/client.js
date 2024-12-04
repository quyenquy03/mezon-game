function navigateTo(pageId) {
  document.querySelectorAll(".content").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// window.addEventListener("beforeunload", (event) => {
//   // Ngăn hành động mặc định
//   event.preventDefault();

//   // Trả về một chuỗi (hoặc để trống, nếu không muốn hiển thị thông báo riêng)
//   event.returnValue = "Bạn có chắc chắn muốn rời khỏi trang này?";
// });
let choosedOption = null;
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

const joinRoomWithSearch = () => {
  const roomId = document.getElementById("room-id-search").value;
  joinRoom(roomId);
};

const joinRoom = (roomId) => {
  socket.emit("joinRoom", {
    roomId,
    userId: user.userId,
  });
};
socket.on("joinRoomSuccess", (roomInfo) => {
  navigateTo("room-content");
  const modalJoinRoom = document.getElementById("modal-search-room");
  const modal = bootstrap.Modal.getInstance(modalJoinRoom);
  if (modal) {
    modal.hide();
  }
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
  renderRoomMembers(members);
  console.log("Room members:", members);
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
  console.log("List users:", users);
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

// start countdown
function startCountdown(countdown = 9) {
  const countdownArea = document.getElementById("countdown-time");
  var countdownInterval = setInterval(() => {
    countdownArea.innerHTML = `0${countdown}`;
    countdown--;

    if (countdown < 0) {
      console.log("Stopping interval");
      clearInterval(countdownInterval);
      countdownArea.innerHTML = `00`;
    }
  }, 1000);
}

const chooseOption = (option) => {
  const choosedOptionElement = document.querySelector(".btn-choice.active");
  if (choosedOptionElement) {
    choosedOptionElement.classList.remove("active");
  }
  const choosedOptionElementNew = document.querySelector(`.btn-choice.${option}`);
  choosedOptionElementNew.classList.add("active");

  choosedOption = option;
};

socket.on("startGameSuccess", (data) => {
  const modalElement = document.getElementById("modal-start-round");
  if (!modalElement.classList.contains("show")) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
  socket.emit("startRound", {
    userId: user.userId,
    roomId: data.roomInfo.roomId,
    roundGame: data.currentRound,
    roundId: data.roundId,
    currentTurn: 1,
  });
});

socket.on("startTurn", (data) => {
  console.log("Start turn", data);
  renderCurrentRoundInfo(data);
  refreshTurnResult();
  startCountdown(5);
  // const modalElement = document.getElementById("modal-start-round");
  // const modal = new bootstrap.Modal(modalElement);
  // modal.show();
});
socket.on("submitTurnNow", (data) => {
  const choosedOptionElement = document.querySelector(".btn-choice.active");
  let choice = null;
  if (choosedOptionElement) {
    choice = choosedOptionElement.dataset.choice;
  }
  socket.emit("submitTurn", {
    userId: user.userId,
    roomId: data.roomId,
    roundGame: data.roundGame,
    currentTurn: data.currentTurn,
    choosedOption: choice,
  });
  setTimeout(() => {
    socket.emit("getTurnResult", {
      userId: user.userId,
      roomId: data.roomId,
      roundGame: data.roundGame,
      currentTurn: data.currentTurn,
    });
  }, 1000);
});

const renderTurnResult = (data) => {
  const myChoiceElement = document.querySelector(".my-choice");
  const rivalChoiceElement = document.querySelector(".rival-choice");

  myChoiceElement.setAttribute("src", `./assets/images/${data.yourChoice ?? "rock-paper-scissors"}.png`);
  rivalChoiceElement.setAttribute("src", `./assets/images/${data.rivalChoice ?? "rock-paper-scissors"}.png`);

  const resultElement = document.querySelector(".turn-result");
  resultElement.innerHTML = data.result;
};
const refreshTurnResult = () => {
  const myChoiceElement = document.querySelector(".my-choice");
  const rivalChoiceElement = document.querySelector(".rival-choice");

  myChoiceElement.setAttribute("src", `./assets/images/rock-paper-scissors.png`);
  rivalChoiceElement.setAttribute("src", `./assets/images/rock-paper-scissors.png`);

  const resultElement = document.querySelector(".turn-result");
  resultElement.innerHTML = "";
};
socket.on("getTurnResult", (data) => {
  startCountdown(4);
  renderTurnResult(data);
  setTimeout(() => {
    socket.emit("startRound", {
      userId: user.userId,
      roomId: data.roomId,
      roundGame: data.roundGame,
      roundId: data.roundId,
      currentTurn: data.currentTurn + 1,
    });
  }, 5000);
});

socket.on("endOfRound", (data) => {
  const endRoundElement = document.querySelector(".turn-result");
  if (data.isWinner) {
    endRoundElement.innerHTML = `
      <h5 class='end-round-result'>Bạn thắng</h5>
      <span class='end-round-desc'>Vui lòng chờ để chuyển qua vòng đấu tiếp theo</span>
    `;
    socket.emit("continueJoin", {
      userId: user.userId,
      roomId: data.roomId,
      roundGame: data.roundGame + 1,
    });
  } else {
    endRoundElement.innerHTML = `
      <h5 class='end-round-result'>Bạn thua rồi</h5>
      <span class='end-round-desc'>Ngồi chờ mọi người chơi xong để bắt đầu trận mới nhé!</span>
    `;
  }
  // modal.show();
});

socket.on("continueJoinSuccess", (data) => {
  const modalEndRoundElement = document.getElementById("modal-end-round");
  const modal = new bootstrap.Modal(modalEndRoundElement);
  setTimeout(() => {
    const dataEmit = {
      ...data,
      roomId: data.roomId,
      userId: user.userId,
    };
    socket.emit("combindNextRound", dataEmit);
    modal.hide();
  }, 5000);
});
socket.on("endOfGame", (data) => {
  const endRoundElement = document.querySelector(".turn-result");
  if (data.winner === user.userId) {
    endRoundElement.innerHTML = `
      <h5 class='end-round-result'>Kết thúc trận đấu</h5>
      <div class='end-round-desc'>Chúc mừng! Bạn đã thắng trận 😍😍</div>
      <div class='end-round-desc'>Trở về phòng sau 10s</div>
    `;
  } else {
    endRoundElement.innerHTML = `
      <h5 class='end-round-result'>Kết thúc trận đấu</h5>
      <div class='end-round-desc'>Oh noo! Bạn thua rồi 😥</div>
      <div class='end-round-desc'>Trở về phòng sau 10s</div>
    `;
  }
  setTimeout(() => {
    const modalStartRound = document.getElementById("modal-start-round");
    const modal = bootstrap.Modal.getInstance(modalStartRound);
    modal.hide();
    navigateTo("room-content");
  }, 10000);
  startCountdown(9);
});
