var socket = io();
let roomUniqueId = null;
let player1 = false;
let choices = {};
let round = 3;
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
    copyButton.classList.add('btn', 'btn-primary', 'py-2', 'my-2')
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
    startCountdown();
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

socket.on("result", (data) => {
    const countdownArea = document.getElementById('countdownArea');

    if (!choices.p1 && !choices.p2) {
        data.winner = 'd';
    }

    // let countdown = 10;
    countdownArea.style.display = 'block';
    winnerArea.innerHTML = '';

    if (choices.p1 && choices.p2) {
        // clearInterval(countdownInterval);
        showResult(data);
    }

    // countdownInterval = setInterval(() => {
    //     countdownArea.innerHTML = `${countdown}`;
    //     countdown--;
    //     if (countdown <= -1) {
    //         clearInterval(countdownInterval);
    //         showResult(data);
    //     }
    // }, 1000);
});

function showResult(data) {
    let winnerText = '';
    const playerChoice = document.querySelector('.player-choice');
    const opponentChoice = document.querySelector('.opponent-choice');
    const winnerArea = document.getElementById('winnerArea');
    playerChoice.style.display = 'block';
    playerChoice.src = `./assets/images/${choices.p1}.png`;
    opponentChoice.style.display = 'block';
    opponentChoice.src = `./assets/images/${choices.p2}.png`;

    if (data.winner !== 'd') {
        if (data.winner === 'p1' && player1) {
            winnerText = 'You win';
        } else if (data.winner === 'p1') {
            winnerText = 'You lose';
        } else if (data.winner === 'p2' && !player1) {
            winnerText = 'You win';
        } else if (data.winner === 'p2') {
            winnerText = 'You lose';
        }
    } else {
        winnerText = `It's a draw`;
    }

    winnerArea.innerHTML = winnerText;
}

function startCountdown() {
    let countdown = 10;
    const countdownArea = document.getElementById('countdownArea');
    countdownArea.style.display = 'block';

    countdownInterval = setInterval(() => {
        countdownArea.innerHTML = `${countdown}`;
        countdown--;
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            checkChoicesTimeout();
        }
    }, 1000);
}

function checkChoicesTimeout() {
    if (!choices.p1 && !choices.p2) {
        socket.emit("result", { winner: 'd', roomUniqueId: roomUniqueId });
    } else if (!choices.p1) {
        socket.emit("result", { winner: 'p2', roomUniqueId: roomUniqueId });
    } else if (!choices.p2) {
        socket.emit("result", { winner: 'p1', roomUniqueId: roomUniqueId });
    } else {
        determineWinner();
    }
}

function determineWinner() {
    if (choices.p1 === choices.p2) {
        socket.emit("result", { winner: 'd', roomUniqueId: roomUniqueId });
    } else if (
        (choices.p1 === 'rock' && choices.p2 === 'scissors') ||
        (choices.p1 === 'scissors' && choices.p2 === 'paper') ||
        (choices.p1 === 'paper' && choices.p2 === 'rock')
    ) {
        socket.emit("result", { winner: 'p1', roomUniqueId: roomUniqueId });
    } else {
        socket.emit("result", { winner: 'p2', roomUniqueId: roomUniqueId });
    }
}

function sendChoice(rpsValue) {
    const choiceEvent = player1 ? "p1Choice" : "p2Choice";
    choices.p1 = rpsValue;
    socket.emit(choiceEvent, {
        rpsValue: rpsValue,
        roomUniqueId: roomUniqueId
    });
}

function genOpponentChoice(data) {
    choices.p2 = data.rpsValue;
}
