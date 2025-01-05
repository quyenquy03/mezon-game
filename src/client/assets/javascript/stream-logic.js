const handleLeaveGame = () => {
  if (modalStartRound && modalStartRound.classList.contains("show")) {
    const modal = bootstrap.Modal.getInstance(modalStartRound);
    modal.hide();
  }
  if (modalShowGame && modalShowGame.classList.contains("show")) {
    const modal = bootstrap.Modal.getInstance(modalShowGame);
    modal.hide();
  }
  navigateTo("room-content");
  if (listChoice) {
    listChoice.classList.remove("hide");
  }
  if (endGameAction) {
    endGameAction.classList.add("hide");
  }
};

const handleShowGame = () => {
  const modalStart = bootstrap.Modal.getInstance(modalStartRound);
  if (modalStart) {
    modalStart.hide();
  }
  const modal = new bootstrap.Modal(modalShowGame);
  if (modal) {
    modal.show();
  }
  socket.emit("getWatchGame");
};

const watchGameOfUser = (userId) => {
  socket.emit("watchGameOfUser", userId);
};

const renderListMemberStream = (listMembers) => {
  listMemberStream.innerHTML = "";
  listMembers.forEach((member) => {
    const memberElement = document.createElement("div");
    memberElement.classList.add("member-item", `${member.status === "lose" && "member-lose"}`);
    memberElement.innerHTML = `
      <img class="member-avatar" src="assets/images/user.png" alt="" />
      <div class="member-info">
        <div class="member-name">${member.userInfo.username}</div>
        <div class="member-score">${
          member.status === "playing" ? "Đang chơi" : member.status === "pending" ? "Đang chờ đấu" : "Đã thua"
        }</div>
      </div>
      <span>
        <img class="eye-icon" src="./assets/images/eye.png" alt="" />
      </span>
    `;
    memberElement.addEventListener("click", () => {
      const activeMember = document.querySelector(".member-item.active");
      if (activeMember) {
        activeMember.classList.remove("active");
      }
      memberElement.classList.add("active");
      watchGameOfUser(member.userInfo.userId);
    });
    listMemberStream.appendChild(memberElement);
  });
};

socket.on("watchGame", (data) => {
  renderListMemberStream(data);
});

const renderStreamStateResult = (stateResult, userId) => {
  const player1Score = document.querySelector(".stream-user-score.player-1");
  const player2Score = document.querySelector(".stream-user-score.player-2");
  player1Score.innerHTML = stateResult
    ?.map((e) => {
      if (e === userId) {
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
      if (e === userId) {
        return `<img src="./assets/images/lose.png" class="state-result"/>`;
      } else if (e === null) {
        return `<img src="./assets/images/draw.png" class="state-result"/>`;
      } else {
        return `<img src="./assets/images/win.png" class="state-result"/>`;
      }
    })
    .join("");
};

const renderGameOfUser = (data) => {
  const { userInfo, rivalInfo, status, result, currentTurn } = data;
  const player1Choice = result[currentTurn - 1]?.player1Choice;
  const player2Choice = result[currentTurn - 1]?.player2Choice;
  const winner = result[currentTurn - 1]?.winner;

  headerStreamLeft.innerHTML = `
    <div class='game-user game-user-left'>
      <img class='game-user-avatar' src="${userInfo?.avatar}" alt="">
      <div class='game-user-info'>
        <div class='game-user-name'>${userInfo?.name}</div>
        <div class='stream-user-score player-1'>
        </div>
      </div>
    </div>
  `;

  headerStreamRight.innerHTML = `
    <div class='game-user game-user-right'>
      <img class='game-user-avatar' src="${rivalInfo?.avatar}" alt="">
      <div class='game-user-info'>
        <div class='game-user-name'>${rivalInfo?.name}</div>
        <div class='stream-user-score player-2'>
        </div>
      </div>
    </div>
  `;

  const stateResult = result?.map((e) => e.winner);
  renderStreamStateResult(stateResult, userInfo.userId);

  player1NameStream.innerText = userInfo.username;
  player2NameStream.innerText = rivalInfo.username;
  player1ChoiceStream.src = `assets/images/${
    player1Choice && player1Choice?.trim() !== "" ? player1Choice : "rock-paper-scissors"
  }.png`;
  player2ChoiceStream.src = `assets/images/${
    player2Choice && player2Choice?.trim() !== "" ? player2Choice : "rock-paper-scissors"
  }.png`;
  playerStreamResult.innerText =
    status === "pending"
      ? "Đang chờ đối thủ"
      : status === "lose"
      ? `${userInfo?.username} đã bị loại `
      : result?.length < currentTurn
      ? "Người chơi đang chọn"
      : winner === null
      ? `Lượt đấu ${currentTurn} hoà nhau`
      : userInfo?.userId === winner
      ? `${userInfo.username} thắng lượt đấu ${currentTurn}`
      : `${rivalInfo.username} thắng lượt đấu ${currentTurn}`;
};
socket.on("watchGameOfUser", (data) => {
  renderGameOfUser(data);
});
