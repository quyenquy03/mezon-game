function navigateTo(pageId) {
  document.querySelectorAll(".content").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

const socket = io("http://localhost:3000");

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
    roomMaxUser,
    roomPassword,
    roomUsePassword,
    roomBet,
    owner: user.userId,
    roomRound,
  });
};

socket.on("roomCreated", (roomInfo) => {
  console.log("Room created:", roomInfo);
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

socket.on("startRoundGame", (data) => {
  console.log("Start round game:", data);
});
