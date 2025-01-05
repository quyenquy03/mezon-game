window.Mezon.WebView.postEvent("PING", { message: "Hello Mezon!" });
window.Mezon.WebView.onEvent("PONG", (data) => {
  console.log("Hello Mezon Again!", data);
});

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

const showToast = (toastHeader, toastMessage, type = "success") => {
  const toastElement = document.getElementById("myToast");
  if (toastElement) {
    const toast = new bootstrap.Toast(toastElement, {
      // autohide: false,
    }); // Disable auto-hide
    toastElement.classList.remove(type);
    toastElement.classList.add(type);
    document.getElementById("toastHeader").innerText = toastHeader;
    document.getElementById("toastMessage").innerText = toastMessage;
    toast.show();
  }
};

// document.querySelector("#sendPaymentBtn").addEventListener("click", () => {
//   const receiverId = document.querySelector("#receiverId").value;
//   const amount = document.querySelector("#amount").value;
//   const note = document.querySelector("#note").value;
//   sendPayment(receiverId, amount, note);
// });

// function sendPayment(receiverId, amount, note) {
//   window.Mezon.WebView.postEvent("SEND_TOKEN", {
//     sender_id: "1840651775758045184",
//     sender_name: "Bot of game",
//     receiver_id: receiverId,
//     amount: amount,
//     note: note,
//   });
// }
