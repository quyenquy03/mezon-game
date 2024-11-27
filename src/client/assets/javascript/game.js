var socket = io();
let roomUniqueId = null;
let player1 = false;
let choices = {};
let round = 3;
let countdownInterval = null;

function createGame() {
    player1 = true;
    socket.emit('createGame', { maxRounds: 3 });
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
        navigator.clipboard.writeText(roomUniqueId).then(() => {
            console.log('Async: Copying to clipboard was successful!');
        }, (err) => {
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
    startCountdown(); // Start the countdown when both players are connected
});

socket.on("p1Choice", (data) => {
    if (!player1) {
        genOpponentChoice(data);
        checkChoices(); // Check if both players have chosen
    }
});

socket.on("p2Choice", (data) => {
    if (player1) {
        genOpponentChoice(data);
        checkChoices(); // Check if both players have chosen
    }
});

function startCountdown() {
    let countdown = 10;
    const countdownArea = document.getElementById('countdownArea');
    countdownArea.style.display = 'block';

    countdownInterval = setInterval(() => {
        countdownArea.innerHTML = `${countdown}`;
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval);
            handleTimeout(); // Handle timeout when countdown reaches zero
        }
    }, 1000);
}

function handleTimeout() {
    if (!choices.p1 && !choices.p2) {
        // Both players didn't choose, it's a draw
        socket.emit("result", { winner: 'd', roomUniqueId: roomUniqueId });
    } else if (!choices.p1) {
        // Player 1 didn't choose, player 2 wins
        socket.emit("result", { winner: 'p2', roomUniqueId: roomUniqueId });
    } else if (!choices.p2) {
        // Player 2 didn't choose, player 1 wins
        socket.emit("result", { winner: 'p1', roomUniqueId: roomUniqueId });
    }
}

function checkChoices() {
    if (choices.p1 && choices.p2) {
        // Both players made a choice, stop countdown and show the result
        clearInterval(countdownInterval);
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

socket.on("result", (data) => {
    const countdownArea = document.getElementById('countdownArea');
    countdownArea.style.display = 'none'; // Hide countdown when result is displayed
    showResult(data);
});

function showResult(data) {
    let winnerText = '';
    const playerChoice = document.querySelector('.player-choice');
    const opponentChoice = document.querySelector('.opponent-choice');
    const winnerArea = document.getElementById('winnerArea');
    playerChoice.style.display = 'block';
    playerChoice.src = `./assets/images/${choices.p1 ? choices.p1 : 'rock-paper-scissors'}.png`;
    opponentChoice.style.display = 'block';
    opponentChoice.src = `./assets/images/${choices.p2 ? choices.p2 : 'rock-paper-scissors'}.png`;

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

    setTimeout(() => {
        console.log('next round');
        socket.emit("nextRound", { roomUniqueId: roomUniqueId });
    }, 3000);
}

socket.on("playGame", (data) => {
    const countdownArea = document.getElementById('countdownArea');
    const winnerArea = document.getElementById('winnerArea');
    const playerChoice = document.querySelector('.player-choice');
    const opponentChoice = document.querySelector('.opponent-choice');
    playerChoice.style.display = 'block';
    playerChoice.src = `./assets/images/rock-paper-scissors.png`;
    opponentChoice.style.display = 'block';
    opponentChoice.src = `./assets/images/rock-paper-scissors.png`;
    // Reset choices and UI for the new round
    choices = {};
    countdownArea.innerHTML = '';
    winnerArea.innerHTML = '';
    playerChoice.style.display = 'none';
    opponentChoice.style.display = 'none';

    alert(`Round ${data.round} starts now!`);
    startCountdown(); // Start the countdown for the new round
});

function sendChoice(rpsValue) {
    const choiceEvent = player1 ? "p1Choice" : "p2Choice";
    choices[player1 ? 'p1' : 'p2'] = rpsValue; // Record player's choice
    socket.emit(choiceEvent, {
        rpsValue: rpsValue,
        roomUniqueId: roomUniqueId
    });
}

function genOpponentChoice(data) {
    choices[player1 ? 'p2' : 'p1'] = data.rpsValue; // Record opponent's choice
}
