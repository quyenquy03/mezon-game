const handleLeaveGame = () => {
  const modal = bootstrap.Modal.getInstance(modalStartRound);
  modal.hide();
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

const renderListMemberStream = (listMembers) => {
  listMemberStream.innerHTML = "";
  listMembers.forEach((member) => {
    const memberElement = document.createElement("div");
    memberElement.classList.add("member-item");
    memberElement.innerHTML = `
      <img class="member-avatar" src="assets/images/user.png" alt="" />
      <div class="member-info">
        <div class="member-name">${member.userInfo.name}</div>
        <div class="member-score">${
          member.status === "playing" ? "Đang chơi" : member.status === "pending" ? "Đang chờ đấu" : "Đã thua"
        }</div>
      </div>
      <span>
        <img class="eye-icon" src="./assets/images/eye.png" alt="" />
      </span>
    `;
    listMemberStream.appendChild(memberElement);
  });
};
socket.on("watchGame", (data) => {
  renderListMemberStream(data);
});
