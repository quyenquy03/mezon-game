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
        <div class="member-score">${member.status === "playing" ? "Đang chơi" : member.status === "pending" ? "Đang chờ đấu" : "Đã thua"
      }</div>
      </div>
      <span>
        <img class="eye-icon" src="./assets/images/eye.png" alt="" />
      </span>
    `;
    listMemberStream.appendChild(memberElement);
  });
};

let stateResultMatch = [];
const renderStateResult_ = (data) => {
  const displayMatches = document.querySelector('.display-matches');
  displayMatches.innerHTML = "";
  data.map((e) => {
    const createElement = document.createElement("div");
    createElement.innerHTML = `
    <div class="row bg-match mb-3">
                <div class="col col-4">
                  <div class="round-player-box player-1-box">
                    <img src="./assets/images/${e.player1Choice ?? "user" }.png" alt="" class="player1-choice" width="100" height="100"/>
                    <div class="player-1-info">
                      <div class="player-1-name">User ${e.player1}</div>
                      <div class="player-1-score">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col col-4">
                  <div
                    class="round-result text-center d-flex align-items-center justify-content-center h-100 flex-direction-column"
                  >
                    <img src="./assets/images/swords.png" class="" width="80" height="80"/>
                  </div>
                </div>
                <div class="col col-4">
                  <div class="round-player-box player-1-box">
                    <img src="./assets/images/${e.player2Choice ?? "user" }.png" alt="" class="player2-choice" width="100" height="100"/>
                    <div class="player-2-info">
                      <div class="player-2-name">User ${e.player2}</div>
                      <div class="player-2-score">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
    ` 
    displayMatches.appendChild(createElement);
  })
};

socket.on("watchGame", (data) => {
  renderListMemberStream(data);
});
// watch matches when user lose
socket.on("listMatch", (data) => {
  renderStateResult_(data);
});

// list match player
socket.on("displayMatches", (data) => {
  // console.log('displayMatches:', data);
  let uniquePlayers = data.filter((item, index, self) =>
    index === self.findIndex(other =>
      (item.player1 === other.player1 && item.player2 === other.player2) ||
      (item.player1 === other.player2 && item.player2 === other.player1)
    )
  );
  
  renderMatches(uniquePlayers);
});

function getChoiceIcon(choice) {
  switch (choice) {
    case 'rock':
      return './assets/images/rock.png';
    case 'paper':
      return './assets/images/paper.png';
    case 'scissors':
      return './assets/images/scissors.png';
    default:
      return '';
  }
}

let isModalVisible = false;
function toggleModal() {
  const modalInstance = bootstrap.Modal.getInstance(modalShowMatches) || new bootstrap.Modal(modalShowMatches);
  if (isModalVisible) {
    modalInstance.hide(); // Hide the modal
    isModalVisible = false;
  } else {
    modalInstance.show(); // Show the modal
    isModalVisible = true;
  }
}

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'a') {
    event.preventDefault();
    toggleModal();
  }
});

const renderMatches = (matches) => {
  const matchDiv = document.querySelector(".matches");
  matchDiv.innerHTML="";
  matches.forEach((match) => {
    const createElement = document.createElement("div");
    createElement.innerHTML = 
    `
    <div class="row bg-match mb-3">
                  <div class="col col-4">
                    <div class="round-player-box player-1-box ta-center">
                      <img src="./assets/images/user.png" alt="" class="player1-choice" width="100" height="100"/>
                      <div class="player-1-info">
                        <div class="player-1-name">User ${match.player1}</div>
                      </div>
                    </div>
                  </div>
                  <div class="col col-4">
                    <div
                      class="round-result text-center d-flex align-items-center justify-content-center h-100 flex-direction-column"
                    >
                      <img src="./assets/images/swords.png" class="" width="80" height="80"/>
                    </div>
                  </div>
                  <div class="col col-4">
                    <div class="round-player-box player-1-box ta-center">
                      <img src="./assets/images/user.png" alt="" class="player2-choice" width="100" height="100"/>
                      <div class="player-2-info">
                        <div class="player-2-name">User ${match.player2}</div>
                      </div>
                    </div>
                  </div>
                </div>
    `
    matchDiv.appendChild(createElement);
  })
}