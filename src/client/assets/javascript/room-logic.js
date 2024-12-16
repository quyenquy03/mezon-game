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
    owner: user?.userId,
    roomRound,
  });
};

socket.on("roomCreated", (roomInfo) => {
  navigateTo("room-content");
  socket.emit("joinRoom", {
    roomId: roomInfo?.roomId,
    userId: user?.userId,
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
    userId: user?.userId,
  });
};

const renderRoomInfo = (roomInfo) => {
  const roomInfoBoxElement = document.querySelector(".room-info-box");
  roomInfoBoxElement.innerHTML = `
    <div class='room-info-item'>
      <span class='room-info-label'>Mã phòng:</span>
      <span class='room-info-value'>${roomInfo?.roomId}</span>
    </div>
    <div class='room-info-item'>
      <span class='room-info-label'>Tên phòng:</span>
    <span class='room-info-value'>${roomInfo?.roomName}</span>
    </div>
    <div class='room-info-item'>
      <span class='room-info-label'>Số người chơi:</span>
      <span class='room-info-value room-member-info'>${roomInfo?.roomMaxUser}</span>
    </div>
    <div class='room-info-item'>
      <span class='room-info-label'>Mật khẩu phòng:</span>
      <span class='room-info-value'>${
        roomInfo?.roomPassword === null || roomInfo?.roomUsePassword ? "Không dùng mật khẩu" : roomInfo?.roomPassword
      }</span>
    </div>
    <div class='room-info-item'>
      <span class='room-info-label'>Mức cược:</span>
      <span class='room-info-value'>${roomInfo?.roomBet}</span>
    </div>
  `;
};
socket.on("joinRoomSuccess", (roomData) => {
  navigateTo("room-content");
  renderRoomInfo(roomData?.roomInfo);
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
    userId: user?.userId,
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

const renderCurrentRoomInfo = (roomInfo, roomMembers) => {
  const roomMemberElement = document.querySelector(".game-members");
  const roomMemberInfoElement = document.querySelector(".room-info-item .room-member-info");
  roomMemberElement.innerHTML = "";
  const maxMember = roomInfo?.roomInfo?.roomMaxUser;
  const owner = roomInfo?.roomInfo?.owner;
  if (roomMemberInfoElement) {
    roomMemberInfoElement.innerHTML = `${roomMembers?.length}/${maxMember}`;
  }

  Array.from({ length: maxMember }).forEach((_, index) => {
    const memberElement = document.createElement("div");
    const member = roomMembers?.[index];
    memberElement.classList.add("game-member-item");
    if (!member) {
      memberElement.classList.add("opacity-50");
    }
    memberElement.innerHTML = `
      <img class='member-avatar' src="https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg" alt="">
      <span class='member-name'>${member?.name ?? "Waiting..."}</span>
    `;
    roomMemberElement.appendChild(memberElement);
  });

  const startGameButtonElement = document.querySelector(".btn-start-game");
  const handleStartGame = () => {
    startGame(user?.userId, roomInfo?.roomInfo?.roomId);
  };

  startGameButtonElement.replaceWith(startGameButtonElement.cloneNode(true));
  const newStartGameButton = document.querySelector(".btn-start-game");

  if (user?.userId === owner) {
    newStartGameButton.addEventListener("click", handleStartGame);
    newStartGameButton.innerHTML = "START";
    newStartGameButton.disabled = false;
  } else {
    newStartGameButton.innerHTML = "Waiting";
    newStartGameButton.disabled = true;
  }
};

socket.on("currentRoom", (data) => {
  renderCurrentRoomInfo(data?.currentRoom, data?.roomMembers);
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
      <span class='member-name'>${member?.name ?? "Waiting..."}</span>
    `;
  });
};
socket.on("roomMembers", (members) => {
  renderRoomMembers(members);
});
