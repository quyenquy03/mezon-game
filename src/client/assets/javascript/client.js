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
const socket = io({
  transports: ["polling"], // Chỉ sử dụng long polling
});

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
    userCoin: 1000,
  };
};
const user = generateUser();
const fetchUser = () => {
  setTimeout(() => {
    socket.emit("userInfo", user);
  }, 1000);
};
fetchUser();
let prize;
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

const renderRoomInfo = (roomInfo) => {
  const roomInfoBoxElement = document.querySelector(".room-info-box");
  roomInfoBoxElement.innerHTML = `
    <div class='room-info-item'>
      <span class='room-info-label'>Mã phòng:</span>
      <span class='room-info-value'>${roomInfo.roomId}</span>
    </div>
    <div class='room-info-item'>
      <span class='room-info-label'>Tên phòng:</span>
    <span class='room-info-value'>${roomInfo.roomName}</span>
    </div>
    <div class='room-info-item'>
      <span class='room-info-label'>Số người chơi:</span>
      <span class='room-info-value room-member-info'>${roomInfo.roomMaxUser}</span>
    </div>
    <div class='room-info-item'>
      <span class='room-info-label'>Mật khẩu phòng:</span>
      <span class='room-info-value'>${
        roomInfo.roomPassword === null || roomInfo.roomUsePassword ? "Không dùng mật khẩu" : roomInfo.roomPassword
      }</span>
    </div>
    <div class='room-info-item'>
      <span class='room-info-label'>Mức cược:</span>
      <span class='room-info-value'>${roomInfo.roomBet}</span>
    </div>
  `;
};
socket.on("joinRoomSuccess", (roomData) => {
  navigateTo("room-content");
  renderRoomInfo(roomData.roomInfo);
  const modalJoinRoom = document.getElementById("modal-search-room");
  const modal = bootstrap.Modal.getInstance(modalJoinRoom);
  if (modal) {
    modal.hide();
  }
  const buttonCreateRoom = document.querySelector(".create-button");
  const buttonSearchRoom = document.querySelector(".search-button");
  const buttonLeaveRoom = document.querySelector(".leave-button");
  const buttonOnlineRoom = document.querySelector(".online-button");

  buttonCreateRoom.classList.add("hide");
  buttonSearchRoom.classList.add("hide");
  buttonLeaveRoom.classList.remove("hide");
  buttonOnlineRoom.classList.remove("hide");
});
socket.on("joinRoomError", (message) => {
  alert(message);
});

const leaveRoom = () => {
  socket.emit("leaveRoom", {
    userId: user.userId,
  });
};

socket.on("leaveRoomSuccess", () => {
  navigateTo("home-content");
  const buttonCreateRoom = document.querySelector(".create-button");
  const buttonSearchRoom = document.querySelector(".search-button");
  const buttonLeaveRoom = document.querySelector(".leave-button");
  const buttonOnlineRoom = document.querySelector(".online-button");

  buttonCreateRoom.classList.remove("hide");
  buttonSearchRoom.classList.remove("hide");
  buttonLeaveRoom.classList.add("hide");
  buttonOnlineRoom.classList.add("hide");
});

socket.emit("listRooms");
socket.on("listRooms", (rooms) => {
  renderListRoom(rooms);
});

const renderCurrentRoomInfo = (roomInfo) => {
  const roomMemberElement = document.querySelector(".game-members");
  const roomMemberInfoElement = document.querySelector(".room-info-item .room-member-info");
  roomMemberElement.innerHTML = "";
  const maxMember = roomInfo.roomInfo.roomMaxUser;
  const owner = roomInfo.roomInfo.owner;
  const roomMembers = roomInfo.roomMember;
  if (roomMemberInfoElement) {
    roomMemberInfoElement.innerHTML = `${roomMembers.length}/${maxMember}`;
  }

  Array.from({ length: maxMember }).forEach((_, index) => {
    const memberElement = document.createElement("div");
    const member = roomMembers?.[index];
    memberElement.classList.add("game-member-item", "opacity-50");
    memberElement.innerHTML = `
      <img class='member-avatar' src="https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg" alt="">
      <span class='member-name'>${member?.name ?? "Waiting..."}</span>
    `;
    roomMemberElement.appendChild(memberElement);
  });

  const startGameButtonElement = document.querySelector(".btn-start-game");
  const handleStartGame = () => {
    startGame(user.userId, roomInfo.roomInfo.roomId);
  };

  startGameButtonElement.replaceWith(startGameButtonElement.cloneNode(true));
  const newStartGameButton = document.querySelector(".btn-start-game");

  if (user.userId === owner) {
    newStartGameButton.addEventListener("click", handleStartGame);
    newStartGameButton.innerHTML = "START";
    newStartGameButton.disabled = false;
  } else {
    newStartGameButton.innerHTML = "Waiting";
    newStartGameButton.disabled = true;
  }
};

socket.on("currentRoom", (roomInfo) => {
  renderCurrentRoomInfo(roomInfo);
});

const renderRoomMembers = (members) => {
  const gameMemberItems = document.querySelectorAll(".game-member-item");
  gameMemberItems.forEach((gameMemberItem, index) => {
    const member = members[index];
    if (member) {
      gameMemberItem.classList.remove("opacity-50");
    }
    gameMemberItem.innerHTML = `
      <img class='member-avatar' src="https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg" alt="">
      <span class='member-name'>${member?.name ?? "Waiting"}</span>
    `;
  });
};
socket.on("roomMembers", (members) => {
  renderRoomMembers(members);
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
});

const renderUserInfo = (userInfo) => {
  const userInfoElement = document.querySelector(".account-box");
  const coinText = document.querySelector(".coin-text");

  if (!userInfoElement) {
    console.error("Element with class 'account-box' not found.");
    return;
  }
  coinText.innerHTML = userInfo?.userCoin;

  userInfoElement.innerHTML = `
    <div class="avatar">
      <img src="${userInfo.avatar}" alt="${userInfo.name}" />
    </div>
    <div class="name">
      <span class="user-name">${userInfo.name}</span>
    </div>
  `;
};

socket.on("userInfo", (userInfo) => {
  console.log(userInfo);
  renderUserInfo(userInfo);
});
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

socket.on("startBet", (data) => {
  user.userCoin = user.userCoin - data;
  renderUserInfo(user);
});

socket.on("endBet", (data) => {
  console.log("endBet", data);
  user.userCoin = user.userCoin + data;
  renderUserInfo(user);
});

let stateResult = [];
const renderStateResult = () => {
  const player1Score = document.querySelector(".game-user-score.player-1");
  const player2Score = document.querySelector(".game-user-score.player-2");
  player1Score.innerHTML = stateResult
    ?.map((e) => {
      if (e === user.userId) {
        return `<img src="./assets/images/win.png" class="state-result"/>`;
      } else if (e === null) {
        return `<img src="./assets/images/draw.png" class="state-result"/>`;
      } else {
        return `<img src="./assets/images/lose.png" class="state-result"/>`;
      }
    })
    .join("");
  player2Score.innerHTML = stateResult
    ?.map((e) => {
      if (e === user.userId) {
        return `<img src="./assets/images/lose.png" class="state-result"/>`;
      } else if (e === null) {
        return `<img src="./assets/images/draw.png" class="state-result"/>`;
      } else {
        return `<img src="./assets/images/win.png" class="state-result"/>`;
      }
    })
    .join("");
};

const renderCurrentRoundInfo = (roundInfo) => {
  const headerGameLeftElement = document.querySelector(".header-game-left");
  const headerGameRightElement = document.querySelector(".header-game-right");
  headerGameLeftElement.innerHTML = `
    <div class='game-user game-user-left'>
      <img class='game-user-avatar' src="${roundInfo.yourInfo?.avatar}" alt="">
      <div class='game-user-info'>
        <div class='game-user-name'>${roundInfo.yourInfo?.name}</div>
        <div class='game-user-score player-1'>
        </div>
      </div>
    </div>
  `;

  headerGameRightElement.innerHTML = `
    <div class='game-user game-user-right'>
      <img class='game-user-avatar' src="${roundInfo.rivalInfo?.avatar}" alt="">
      <div class='game-user-info'>
        <div class='game-user-name'>${roundInfo.rivalInfo?.name}</div>
        <div class='game-user-score player-2'>
        </div>
      </div>
    </div>
  `;
  renderStateResult();
};

// start countdown
function startCountdown(countdown = 9) {
  const countdownArea = document.getElementById("countdown-time");
  var countdownInterval = setInterval(() => {
    countdownArea.innerHTML = `0${countdown}`;
    countdown--;

    if (countdown < 0) {
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

let lastEventTime = 0; // Thời gian của lần xử lý event cuối cùng

socket.on("startGameSuccess", (data) => {
  const now = Date.now();

  // Kiểm tra nếu khoảng cách giữa 2 lần xử lý sự kiện nhỏ hơn 5 giây
  if (now - lastEventTime < 5000) {
    console.warn("Bỏ qua event startGameSuccess vì chưa đủ thời gian chờ.");
    return; // Nếu chưa đủ 5 giây, bỏ qua sự kiện
  }

  lastEventTime = now; // Cập nhật thời gian lần xử lý sự kiện mới

  const modalElement = document.getElementById("modal-start-round");

  // Kiểm tra xem modal đã được hiển thị chưa
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
  const displayTurn = document.querySelector(".turn");
  displayTurn.innerHTML = `Turn ${data.currentTurn}`;
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
  stateResult.push(data.winnerTurnId);
  renderStateResult();
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
  stateResult = [];
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
  stateResult = [];
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

window.Mezon.WebView.postEvent("PING", { message: "Hello Mezon!" });
window.Mezon.WebView.onEvent("PONG", () => {
  console.log("Hello Mezon Again!");
});
