function navigateTo(pageId) {
  document.querySelectorAll(".content").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

let choosedOption = null;
const socket = io({
  transports: ["polling"],
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

const randomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

window.Mezon.WebView.postEvent("PING", { message: "Hello Mezon!" });
window.Mezon.WebView.onEvent("PONG", () => {
  console.log("Hello Mezon Again!");
});
/**
 * phòng
 * mảng người chơi
 * mảng xem đấu {
 *  Mã người xem
 *  Mã người chơi
 * }
 * Khi endRound => loop qua mảng xem đấu
 * nếu có người chơi đang xem thì lấy ra thông tin trận đấu của người đó và trả về cho user đang xem
 *
 * Lặp qua mảng roundGames
 */
