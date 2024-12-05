const connectedUsers = [
    {
        id: "1234",
        userId: 1234,
        name: "User 1234",
        avatar: "https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg",
        socketId: "socket-1234",
    },
    {
        id: "5678",
        userId: 5678,
        name: "User 5678",
        avatar: "https://img.freepik.com/free-psd/3d-render-avatar-character_23-2150611765.jpg",
        socketId: "socket-5678",
    },
];
const listRooms = [
    {
        roomInfo: {
            roomId: "123456",
            roomName: "Phòng 1",
            roomMaxUser: 4,
            roomPassword: null,
            roomUsePassword: false,
            roomBet: 1000,
            owner: 1234,
            roomRound: 5,
        },
        roomMember: [],
        currentRoundMembers: [],
        currentRound: 1,
        room: []
    },
    {
        roomInfo: {
            roomId: "345678",
            roomName: "Phòng 2",
            roomMaxUser: 2,
            roomPassword: null,
            roomUsePassword: false,
            roomBet: 1000,
            owner: 1234,
            roomRound: 5,
        },
        roomMember: [],
        currentRoundMembers: [],
        currentRound: 1,
        room: []
    },
    {
        roomInfo: {
            roomId: "345674448",
            roomName: "Phòng 3",
            roomMaxUser: 2,
            roomPassword: null,
            roomUsePassword: false,
            roomBet: 1000,
            owner: 1234,
            roomRound: 5,
        },
        roomMember: [],
        currentRoundMembers: [],
        currentRound: 1,
        room: []
    },
];
import {createTournamentRooms} from './util.js'
export const handleGameLogic = (socket, io) => {
    // Handle user information
    socket.on("userInfo", (userInfo) => {
        connectedUsers.push({ id: socket.id, ...userInfo });
        io.emit("listUsers", connectedUsers);
        io.emit("userInfo", userInfo);
    });

    socket.on("listUsers", () => {
        io.emit("listUsers", connectedUsers);
    });

    socket.on("listRooms", () => {
        io.emit("listRooms", listRooms);
    });

    socket.on("getRoomMembers", (roomId) => {
        io.emit("roomMembers", getRoomMembers(roomId));
    });

    // Create a new room
    socket.on("createRoom", (roomInfo) => {
        const newRoom = {
            roomInfo,
            roomMember: [],
            currentRoundMembers: [],
            room: [],
        };
        listRooms.push(newRoom);
        socket.emit("roomCreated", roomInfo);
        io.emit("listRooms", listRooms);
    });

    // Join an existing room
    socket.on("joinRoom", (data) => {
        const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
        if (room && room.roomMember.length < room.roomInfo.roomMaxUser && !room.roomMember.includes(data.userId)) {
            room.roomMember.push(data.userId);
            socket.join(data.roomId);
            socket.emit("joinRoomSuccess", room);
            socket.emit("currentRoom", room);
            io.emit("roomMembers", getRoomMembers(data.roomId));
        } else {
            socket.emit("joinRoomError", "Unable to join room");
        }
    });

    // Start a game in a room
    socket.on("startGame", (data) => {
        const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
        if (room && room.roomMember.length === room.roomInfo.roomMaxUser) {
            room.room = createTournamentRooms(room.roomMember);
            
            room.room.forEach((match) => {
                const player1Info = connectedUsers.find((user) => user.userId === match.player1);
                const player2Info = connectedUsers.find((user) => user.userId === match.player2);

                io.to(player1Info?.id).emit("startRoundGame", {
                  yourInfo: player1Info,
                  rivalInfo: player2Info,
                  roomInfo: room,
                  roomUniqueId: room,
                  childRoomId: match.roomId,
                });
                io.to(player2Info?.id).emit("startRoundGame", {
                  yourInfo: player2Info,
                  rivalInfo: player1Info,
                  roomInfo: room,
                  roomUniqueId: room,
                  childRoomId: match.roomId,
                });
            });
        } else {
            socket.emit("startGameError", "Room not ready or not found");
        }
    });

    const getRoomMembers = (roomId) => {
        const room = listRooms.find((room) => room.roomInfo.roomId === roomId);
        
        const listMemberOfRoom = room?.roomMember?.map((member) => {
            return connectedUsers.find((user) => user.userId === member);
        });

        listMemberOfRoom.filter((member) => member !== null);
        return listMemberOfRoom;
    };

    socket.on("playerReady", (data) => {
        const room = listRooms.find((room) => room.roomInfo.roomId === data.roomId);
        if (room) {
            const match = room.room.find((match) => match.roomId === data.childRoomId);
            if (match) {
                match.ready = true;
                checkReadyStatus(room, match, io);
            }
        }
    });

    const checkReadyStatus = (room, match, io) => {
        const readyPlayers = room.room.filter((match) => match.ready);
        if (readyPlayers.length === 2) {
            const finalRoom = room.room.find((r) => r.players.length === 0);
            if (finalRoom) {
                finalRoom.player1 = readyPlayers[0].player1;
                finalRoom.player2 = readyPlayers[1].player2;
                finalRoom.players = [finalRoom.player1, finalRoom.player2];
                finalRoom.ready = false;

                io.to(room.roomInfo.roomId).emit("startFinalMatch", {
                    roomId: finalRoom.roomId,
                    players: finalRoom.players
                });
            }
        }
    };
    function getCurrentRoomOfUser(socketId) {
        return listRooms.find(room => room.roomMember.some(userId => {
            const user = connectedUsers.find(user => user.userId === userId);
            return user && user.id === socketId;
        }));
    }

    // Handle next round
    socket.on("nextRound", (data) => {
        const roomActive = listRooms.find((room) => room.roomInfo.roomId === data.roomUniqueId);
        const room = roomActive?.room?.find((r) => r.roomId === data.gameData.roomId);
        
        if (room) {
            room.rounds++;
            console.log(room,'rooom');
            
            io.to(filterSocketId(data.gameData.player1)).emit("playGame", {
                round: room.rounds,
                gameId: data.roomUniqueId,
                roomId: data.gameData.roomId,
            });
            io.to(filterSocketId(data.gameData.player2)).emit("playGame", {
                round: room.rounds,
                gameId: data.roomUniqueId,
                roomId: data.gameData.roomId,
            });
        }
    });
    function filterSocketId (userId) {
        const user = connectedUsers.find(user => user.userId === userId);
        return user.id;
    }

    // Handle player choices
    socket.on("player", (data) => {
        const roomActive = listRooms.find((room) => room.roomInfo.roomId === data.roomUniqueId);
        const room = roomActive?.room?.find((r) => r.roomId === data.childRoomId);

        if (room) {
          if (room.player1 === data.player) {
            room.p1Choice = data.rpsValue;
          } else if (room.player2 === data.player) {
            room.p2Choice = data.rpsValue;
          }

          if (room.p1Choice !== null && room.p2Choice !== null ) {
            determineWinner(room, data.roomUniqueId);
          }
        }
    });
    function disconnectUser(socket) {
        const userIndex = connectedUsers.findIndex(user => user.id === socket.id);
        if (userIndex !== -1) {
            const user = connectedUsers[userIndex];
            connectedUsers.splice(userIndex, 1);

            // Remove user from any room they are part of
            listRooms.forEach(room => {
                const memberIndex = room.roomMember.indexOf(user.userId);
                if (memberIndex !== -1) {
                    room.roomMember.splice(memberIndex, 1);
                    // Notify remaining user in the room
                    if (room.roomMember.length === 1) {
                        const remainingUser = connectedUsers.find(user => user.userId !== socket.id);

                        if (remainingUser) {
                            io.to(remainingUser.socketId).emit("opponentDisconnected", "Your opponent left. You win!");
                        }
                    }
                }
            });
        }
    }

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        const roomOfUserWithSocketId = getCurrentRoomOfUser(socket.id);
        disconnectUser(socket);
        if (roomOfUserWithSocketId) {
            const remainingMembers = getRoomMembers(roomOfUserWithSocketId.roomInfo.roomId);
            if (remainingMembers.length === 1) {
                const remainingUser = remainingMembers[0];

                io.to(remainingUser?.socketId).emit("opponentDisconnected", "Your opponent left. You win!");
            }
            socket
                .to(roomOfUserWithSocketId.roomInfo.roomId)
                .emit("roomMembers", remainingMembers);
        }
        io.emit("listUsers", connectedUsers);
    });

    function determineWinner(game, roomUniqueId) {
        const gameData = game;
    
        const p1Choice = gameData.p1Choice;
        const p2Choice = gameData.p2Choice;
        let winner;
        let name;
    
        if (!p1Choice && !p2Choice) {
            winner = "d";
        } else if (!p1Choice) {
            winner = "p2";
            name = gameData.player2;
        } else if (!p2Choice) {
            winner = "p1";
            name = gameData.player1;
        } else if (p1Choice === p2Choice) {
            winner = "d";
        } else if ((p1Choice === "rock" && p2Choice === "scissors") ||
                   (p1Choice === "scissors" && p2Choice === "paper") ||
                   (p1Choice === "paper" && p2Choice === "rock")) {
            winner = "p1";
            name = gameData.player1;
        } else if (p1Choice === '') {
            winner = "p2";
            name = gameData.player2;
        } else if (p2Choice === '') {
            winner = "p1";
            name = gameData.player1;
        } else if (p1Choice === '' && p2Choice === '') {
            winner = "d";
        } else {
            winner = "p2";
            name = gameData.player2;
        }
        
        if (winner === "p1") {
            gameData.p1Wins++;
        } else if (winner === "p2") {
            gameData.p2Wins++;
        }
    
        io.sockets.to(roomUniqueId).emit("result", {
            winner: winner,
            nameWinner: name,
            maxRounds: gameData.maxRounds,
            rounds: gameData.rounds,
            p1Wins: gameData.p1Wins,
            p2Wins: gameData.p2Wins,
            gameData: gameData
        });
    
        const requiredStreak = gameData.maxRounds / 2;
    
        if (gameData.p1Wins >= requiredStreak) {
            endGame(roomUniqueId, "p1", name, gameData);
            return;
        }
        if (gameData.p2Wins >= requiredStreak) {
            endGame(roomUniqueId, "p2", name, gameData);
            return;
        }
    
        if (gameData.rounds === gameData.maxRounds) {
            const finalWinner =
                gameData.p1Wins > gameData.p2Wins
                    ? "p1"
                    : gameData.p2Wins > gameData.p1Wins
                        ? "p2"
                        : "d";
    
            endGame(roomUniqueId, finalWinner, name, gameData);
            return;
        }

        gameData.p1Choice = null;
        gameData.p2Choice = null;
    }
    function endGame(roomUniqueId, finalWinner, name, gameData) {
    const roomActive = listRooms.find((room) => room.roomInfo.roomId === roomUniqueId);
    console.log(roomActive, 'roomActive');
        
      io.sockets.to(roomUniqueId).emit("gameOver", {
        winner: finalWinner,
        nameWinner: name,
        p1Wins: gameData.p1Wins,
        p2Wins: gameData.p2Wins,
        rounds: gameData.rounds,
      });
  
      gameData.p1Choice = null;
      gameData.p2Choice = null;
      gameData.p1Wins = 0;
      gameData.p2Wins = 0;
      gameData.rounds = 1;
    }
};