export const createTournamentRooms = (players) => {
    const rooms = [];
    let roomIdCounter = 1;
  
    // Create initial solo rooms
    while (players.length > 1) {
      const player1 = players.shift();
      const player2 = players.shift();
      const roomId = roomIdCounter++;
  
      rooms.push({
        player1: player1,
        player2: player2,
        p1Choice: null,
        p2Choice: null,
        roomId,
        players: [player1, player2],
        rounds: 0,
        maxRounds: 3,
        p1Wins: 0,
        p2Wins: 0
      });
    }
  
    // Create rooms for next rounds
    const totalRooms = rooms.length;
    const nextRoundRooms = totalRooms / 2;
  
    for (let i = 0; i < nextRoundRooms; i++) {
      const roomId = roomIdCounter++;
      rooms.push({
        player1: 0,
        player2: 0,
        p1Choice: null,
        p2Choice: null,
        roomId,
        players: [],
        rounds: 0,
        maxRounds: 3,
        p1Wins: 0,
        p2Wins: 0
      });
    }
  
    // Create final room if needed
    if (nextRoundRooms > 1) {
      const finalRoomId = roomIdCounter++;
      rooms.push({
        player1: 0,
        player2: 0,
        p1Choice: null,
        p2Choice: null,
        roomId: finalRoomId,
        players: [],
        rounds: 0,
        maxRounds: 3,
        p1Wins: 0,
        p2Wins: 0
      });
    }
  
    return rooms;
};

