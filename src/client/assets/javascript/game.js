var socket = io();
let roomUniqueId = null;
let player1 = false;
let choices = {};
let maxRounds = 0;
let winnerArea = document.getElementById('winnerArea');
let player1Choice = document.querySelector('.player1-choice');
let player2Choice = document.querySelector('.player2-choice');
let buttonChoices = document.querySelectorAll('.btn-choice');
let f = true;
function createGame() {
    player1 = true;
    socket.emit('createGame', { maxRounds: 3, maxPlayers: 4 });
}

function joinGame() {
    roomUniqueId = document.getElementById('roomUniqueId').value;
    let namePlayer = document.getElementById('nameplayer').value;
    socket.emit('joinGame', { roomUniqueId: roomUniqueId, namePlayer: namePlayer});
}

// socket.on("fullRoom", () => {
//     alert("Full room!");
// })

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
    }
});

socket.on("p2Choice", (data) => {
    if (player1) {
        genOpponentChoice(data);
    }
});

function startCountdown() {
    let countdown = 5;
    const countdownArea = document.getElementById('countdownArea');
    countdownArea.style.display = 'block';
    var countdownInterval = setInterval(() => {
        countdownArea.innerHTML = `0${countdown}`;
        countdown--;

        if (choices.p1 && choices.p2) {
            console.log('Stopping interval by f');
            clearInterval(countdownInterval);
            countdownArea.innerHTML = `00`;
        }

        if (countdown < 0) {
            console.log('Stopping interval');
            clearInterval(countdownInterval);
            countdownArea.innerHTML = `00`;
        }
    }, 1000);
}

socket.on("result", (data) => {
    let requiredStreak = data.maxRounds / 2;
    console.log('data: ', data);
    console.log('maxrounds: ', data.maxRounds);
    console.log('streak: ', requiredStreak);
    player1Choice.src = `./assets/images/${choices.p1 || 'rock-paper-scissors'}.png`;
    player2Choice.src = `./assets/images/${choices.p2 || 'rock-paper-scissors'}.png`;
    const isPlayerWin = (data.winner === 'p1' && player1) || (data.winner === 'p2' && !player1);
    const isDraw = data.winner === 'd';
    winnerArea.innerHTML = isDraw ? `It's a draw` : isPlayerWin ? 'You win' : 'You lose';
    const handleGameOver = (data) => {
        f = true;
        const message = data.winner === "d" ? `Game Over! It's a draw.` : `Game Over! ${data.winner} is the overall winner!`;
        alert(message);
        buttonChoices.forEach(button => {
            button.setAttribute('disabled', true);
        });
    };

    if (data.rounds == data.maxRounds || data.p1Wins > requiredStreak || data.p2Wins > requiredStreak) {
        socket.on("gameOver", handleGameOver);
    } else if (data.rounds < data.maxRounds) {
        setTimeout(() => {
            console.log('next round');
            socket.emit("nextRound", { roomUniqueId, rounds: data.rounds });
        }, 3000);
    }
});

socket.on("playGame", (data) => {
    player1Choice.src = './assets/images/rock-paper-scissors.png';
    player2Choice.src = './assets/images/rock-paper-scissors.png';
    choices = {};
    winnerArea.innerHTML = '';
    startCountdown();
});

function sendChoice(rpsValue) {
    const choiceEvent = player1 ? "p1Choice" : "p2Choice";
    choices[player1 ? 'p1' : 'p2'] = rpsValue;
    socket.emit(choiceEvent, {
        rpsValue: rpsValue,
        roomUniqueId: roomUniqueId
    });
}

function genOpponentChoice(data) {
    choices[player1 ? 'p2' : 'p1'] = data.rpsValue;
}
