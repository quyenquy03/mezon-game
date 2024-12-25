socket.on("startGameError", (message) => {
  alert(message);
});

socket.on("startBet", (data) => {
  const { totalBet, receiverId } = data;
  if (receiverId !== user?.userId) {
    window.Mezon.WebView.postEvent("SEND_TOKEN", {
      receiver_id: receiverId,
      amount: totalBet,
      note: `Đã đặt cược ${totalBet} token khi chơi game Rock Paper Scissors!`,
    });
  }
  user.wallet = user?.wallet - totalBet;
  renderUserInfo(user);
});

socket.on("endBet", (data) => {
  const { totalBet } = data;
  user.wallet = user?.wallet + totalBet;
  renderUserInfo(user);
});

socket.on("sendBet", (data) => {
  const { totalBet, receiverId } = data;
  if (receiverId !== user?.userId) {
    window.Mezon.WebView.postEvent("SEND_TOKEN", {
      receiver_id: receiverId,
      amount: totalBet,
      note: `Bạn đã thắng ${totalBet} token khi chơi game Rock Paper Scissors!`,
    });
  }
});

let stateResult = [];
const renderStateResult = () => {
  const player1Score = document.querySelector(".game-user-score.player-1");
  const player2Score = document.querySelector(".game-user-score.player-2");
  player1Score.innerHTML = stateResult
    ?.map((e) => {
      if (e === user?.userId) {
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
      if (e === user?.userId) {
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

  myChoiceElement = document.querySelector(".my-choice");
  myChoiceElement.setAttribute("src", `./assets/images/${option}.png`);

  // choosedOption = option;
};

let lastEventTime = 0; // Thời gian của lần xử lý event cuối cùng

socket.on("startGameSuccess", (data) => {
  const now = Date.now();
  // choosedOption = null;

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
  console.log("startRound 130", data);
  socket.emit("startRound", {
    userId: user?.userId,
    roomId: data?.roomInfo?.roomId,
    roundGame: data?.currentRound,
    roundId: data?.roundId,
    currentTurn: 1,
  });
});

socket.on("startTurn", (data) => {
  const displayTurn = document.querySelector(".turn");
  displayTurn.innerHTML = `Turn ${data?.currentTurn}`;
  const choosedOptionElement = document.querySelector(".btn-choice.active");
  if (choosedOptionElement) {
    choosedOptionElement.classList.remove("active");
  }
  renderCurrentRoundInfo(data);
  refreshTurnResult();
  startCountdown(9);
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
    userId: user?.userId,
    roomId: data?.roomId,
    roundGame: data?.roundGame,
    currentTurn: data?.currentTurn,
    choosedOption: choice,
  });
  setTimeout(() => {
    socket.emit("getTurnResult", {
      userId: user?.userId,
      roomId: data?.roomId,
      roundGame: data?.roundGame,
      currentTurn: data?.currentTurn,
    });
  }, 1000);
});

const renderTurnResult = (data) => {
  const myChoiceElement = document.querySelector(".my-choice");
  const rivalChoiceElement = document.querySelector(".rival-choice");

  myChoiceElement.setAttribute(
    "src",
    `./assets/images/${data?.yourChoice && data?.yourChoice?.trim() !== "" ? data?.yourChoice : "rock-paper-scissors"}.png`
  );
  rivalChoiceElement.setAttribute(
    "src",
    `./assets/images/${data?.rivalChoice && data?.rivalChoice?.trim() !== "" ? data?.rivalChoice : "rock-paper-scissors"}.png`
  );

  const resultElement = document.querySelector(".turn-result");
  resultElement.innerHTML = data?.result;
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
  startCountdown(5);
  renderTurnResult(data);
  stateResult.push(data?.winnerTurnId);
  renderStateResult();
  setTimeout(() => {
    socket.emit("startRound", {
      userId: user?.userId,
      roomId: data?.roomId,
      roundGame: data?.roundGame,
      roundId: data?.roundId,
      currentTurn: data?.currentTurn + 1,
    });
  }, 5000);
});

socket.on("endOfRound", (data) => {
  console.log("endOfRound", data);
  const endRoundElement = document.querySelector(".turn-result");
  stateResult = [];

  player1DiceElement.style.opacity = 0;
  player2DiceElement.style.opacity = 0;
  roll.style.opacity = 0;
  d1.style.opacity = 0;
  d2.style.opacity = 0;
  d3.style.opacity = 0;
  time.style.opacity = 1;

  if (data?.isWinner) {
    endRoundElement.innerHTML = `
      Bạn thắng! Chuẩn bị cho vòng tiếp theo nhé!
    `;
    socket.emit("continueJoin", {
      userId: user?.userId,
      roomId: data?.roomId,
      roundGame: data?.roundGame + 1,
    });
  } else {
    if (endGameAction) {
      endGameAction.classList.remove("hide");
    }
    if (listChoice) {
      listChoice.classList.add("hide");
    }
    endRoundElement.innerHTML = `
      Bạn thua! Ngồi chờ trận đấu kết thúc nhé!
    `;
  }
  // modal.show();
});

socket.on("continueJoinSuccess", (data) => {
  // const modalEndRoundElement = document.getElementById("modal-end-round");
  // const modal = new bootstrap.Modal(modalEndRoundElement);
  player1DiceElement.style.opacity = 0;
  player2DiceElement.style.opacity = 0;
  roll.style.opacity = 0;
  d1.style.opacity = 0;
  d2.style.opacity = 0;
  d3.style.opacity = 0;
  time.style.opacity = 1;

  setTimeout(() => {
    const dataEmit = {
      ...data,
      roomId: data?.roomId,
      userId: user?.userId,
    };
    socket.emit("combindNextRound", dataEmit);
    // modal.hide();
  }, 5000);
});
socket.on("endOfGame", (data) => {
  time.style.opacity = 1;
  roll.style.opacity = 0;
  d1.style.opacity = 0;
  d2.style.opacity = 0;
  d3.style.opacity = 0;
  player1DiceElement.style.opacity = 0;
  player2DiceElement.style.opacity = 0;
  if (listChoice) {
    listChoice.classList.add("hide");
  }
  if (endGameAction) {
    endGameAction.classList.add("hide");
  }

  stateResult = [];
  const endRoundElement = document.querySelector(".turn-result");
  if (data?.winner === user?.userId) {
    endRoundElement.innerHTML = `
      Trận đấu kết thúc! Bạn thắng rồi! 🎉
    `;
  } else {
    endRoundElement.innerHTML = `
      Trận đấu kết thúc! Bạn thua rồi! 😭
    `;
  }
  setTimeout(() => {
    const modalStart = bootstrap.Modal.getInstance(modalStartRound);
    if (modalStart) {
      modalStart.hide();
    }

    const modalShow = bootstrap.Modal.getInstance(modalShowGame);
    if (modalShow) {
      modalShow.hide();
    }

    navigateTo("room-content");
    if (listChoice) {
      listChoice.classList.remove("hide");
    }
    if (endGameAction) {
      endGameAction.classList.add("hide");
    }
  }, 10000);
  startCountdown(9);
});

showDice = function (dice1, dice2, dice3) {
  const dice = {
    1: "0 -2px",
    2: "-103px -3px",
    3: "-204px -3px",
    4: "-305px -3px",
    5: "-404px -3px",
    6: "-507px -2px",
  };
  d1.style.background = "url('./assets/images/dice.png') no-repeat " + dice[dice1];
  d2.style.background = "url('./assets/images/dice.png') no-repeat " + dice[dice2];
  d3.style.background = "url('./assets/images/dice.png') no-repeat " + dice[dice3];
  d1.style.opacity = 1;
  d2.style.opacity = 1;
  d3.style.opacity = 1;
};
const showResultDice = (player1Dice, player2Dice) => {
  p1dice1.style.background = `url('./assets/images/dice${player1Dice.dice1}.png')`;
  p1dice2.style.background = `url('./assets/images/dice${player1Dice.dice2}.png')`;
  p1dice3.style.background = `url('./assets/images/dice${player1Dice.dice3}.png')`;

  p2dice1.style.background = `url('./assets/images/dice${player2Dice.dice1}.png')`;
  p2dice2.style.background = `url('./assets/images/dice${player2Dice.dice2}.png')`;
  p2dice3.style.background = `url('./assets/images/dice${player2Dice.dice3}.png')`;

  player1DiceElement.style.opacity = 1;
  player2DiceElement.style.opacity = 1;
};

socket.on("startDiceGame", () => {
  const time = document.getElementById("countdown-time");
  time.style.opacity = 0;
  roll.src = "";
  roll.src = "./assets/images/roll1.gif";
  roll.style.opacity = 1;
});

socket.on("endDiceGame", (data) => {
  console.log("endDiceGame", data);
  const roll = document.getElementById("roll");
  roll.style.opacity = 0;
  showDice(data.myDice.dice1, data.myDice.dice2, data.myDice.dice3);
  showResultDice(data.myDice, data.rivalDice);
  const endRoundElement = document.querySelector(".turn-result");
  if (data?.myDice.total >= data?.rivalDice.total) {
    endRoundElement.innerHTML = `
      Bạn thắng! Chuẩn bị cho vòng tiếp theo nhé!
    `;
  } else {
    endRoundElement.innerHTML = `
      Bạn thua! Ngồi chờ trận đấu kết thúc nhé!
    `;
  }
});
