let user = null;
const generateUser = () => {
  const userId = randomNumber(1000, 9999) + "";
  return {
    userId: userId,
    name: "User " + userId,
    avatar: "https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg",
    wallet: 1000,
  };
};
window.Mezon.WebView.onEvent("CURRENT_USER_INFO", (_, userData) => {
  if (!userData || !userData.user) {
    return;
  }
  user = {
    userId: userData.user?.id,
    name: userData.user?.display_name,
    username: userData.user?.username,
    avatar: userData.user?.avatar_url,
    email: userData?.email,
    wallet: JSON.parse(userData.wallet).value,
  };
  socket.emit("userInfo", user);
});

const renderListUser = (listUsers) => {
  const listUserElement = document.querySelector(".user-list");
  listUserElement.innerHTML = "";
  listUsers.forEach((user) => {
    const userElement = document.createElement("div");
    userElement.classList.add("user-item");
    userElement.innerHTML = `
      <div class="user-avatar">
        <img src="${user?.avatar}" alt="${user?.name}" />
      </div>
      <div class="user-info">
        <span class="user-name">${user?.name}</span>
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
    return;
  }

  coinText.innerHTML = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(userInfo?.wallet ?? 0);

  userInfoElement.innerHTML = `
    <div class="avatar">
      <img src="${userInfo?.avatar}" alt="${userInfo?.username}" />
    </div>
    <div class="name">
      <span class="user-name">${userInfo?.username}</span>
    </div>
  `;
  const loadingBox = document.querySelector(".loading-box");
  if (loadingBox) {
    loadingBox.classList.add("hide");
  }
};

socket.on("userInfo", (userInfo) => {
  renderUserInfo(userInfo);
});
