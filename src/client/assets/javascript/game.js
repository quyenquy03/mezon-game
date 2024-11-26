var socket = io();
let roomUniqueId = null;
let player1 = false;
let choices = {};
let countdownInterval = null;

function createGame() {
    player1 = true;
    socket.emit('createGame');
}

function joinGame() {
    roomUniqueId = document.getElementById('roomUniqueId').value;
    socket.emit('joinGame', { roomUniqueId: roomUniqueId });
}

socket.on("newGame", (data) => {
    roomUniqueId = data.roomUniqueId;
    document.getElementById('initial').style.display = 'none';
    document.getElementById('gamePlay').style.display = 'block';
    let copyButton = document.createElement('button');
    copyButton.style.display = 'block';
    copyButton.classList.add('btn', 'btn-primary', 'py-2', 'my-2');
    copyButton.innerText = 'Copy Code';
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(roomUniqueId).then(function () {
            console.log('Async: Copying to clipboard was successful!');
        }, function (err) {
            console.error('Async: Could not copy text: ', err);
        });
    });
    document.getElementById('waitingArea').innerHTML = `Waiting for opponent, please share code ${roomUniqueId} to join`;
    document.getElementById('waitingArea').appendChild(copyButton);
});

socket.on("playersConnected", () => {
    document.getElementById('initial').style.display = 'none';
    document.getElementById('waitingArea').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';

    startCountdown(); // Bắt đầu đếm ngược khi cả hai người chơi kết nối
});

socket.on("p1Choice", (data) => {
    if (!player1) {
        genOpponentChoice(data);
    }
});

socket.on("p2Choice", (data) => {
    if (player1) {
        genOpponentChoice(data);
    }
});

// Đếm ngược khi bắt đầu
function startCountdown() {
    const countdownArea = document.getElementById('countdownArea');
    countdownArea.style.display = 'block';
    let countdown = 10;

    countdownInterval = setInterval(() => {
        countdownArea.innerHTML = `${countdown}`;
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            handleTimeout(); // Hết thời gian
        }
    }, 1000);
}

function handleTimeout() {
    const winnerArea = document.getElementById('winnerArea');
    if (!choices.p1 && !choices.p2) {
        winnerArea.innerHTML = `It's a draw!`; // Hòa nếu không ai chọn
    } else if (choices.p1 && !choices.p2) {
        winnerArea.innerHTML = `You win!`;
    } else if (!choices.p1 && choices.p2) {
        winnerArea.innerHTML = `You lose!`;
    }
    resetGame();
}

function sendChoice(rpsValue) {
    const choiceEvent = player1 ? "p1Choice" : "p2Choice";
    choices[player1 ? 'p1' : 'p2'] = rpsValue;

    socket.emit(choiceEvent, {
        rpsValue: rpsValue,
        roomUniqueId: roomUniqueId
    });

    checkChoices();
}

function genOpponentChoice(data) {
    choices.p2 = data.rpsValue;
    checkChoices();
}

function checkChoices() {
    if (choices.p1 && choices.p2) {
        clearInterval(countdownInterval);
        determineWinner();
    }
}

function determineWinner() {
    const playerChoice = document.querySelector('.player-choice');
    const opponentChoice = document.querySelector('.opponent-choice');
    const winnerArea = document.getElementById('winnerArea');

    playerChoice.style.display = 'block';
    playerChoice.src = choices.p1 ? `./assets/images/${choices.p1}.png` : './assets/images/default.png';
    opponentChoice.style.display = 'block';
    opponentChoice.src = choices.p2 ? `./assets/images/${choices.p2}.png` : './assets/images/default.png';

    let winnerText = '';
    if (choices.p1 === choices.p2) {
        winnerText = `It's a draw!`;
    } else if (
        (choices.p1 === 'rock' && choices.p2 === 'scissors') ||
        (choices.p1 === 'scissors' && choices.p2 === 'paper') ||
        (choices.p1 === 'paper' && choices.p2 === 'rock')
    ) {
        winnerText = player1 ? 'You win!' : 'You lose!';
    } else {
        winnerText = player1 ? 'You lose!' : 'You win!';
    }

    winnerArea.innerHTML = winnerText;
    resetGame();
}

function resetGame() {
    choices = {};
    document.getElementById('countdownArea').innerHTML = '00';
}
