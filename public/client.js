
class GameClient {
  constructor() {
    this.ws = null;
    this.gameId = null;
    this.isConnected = false;
    
    // Callbacks that other modules can set
    this.onGameStateUpdate = null;  // Called when server sends GAME_STATE
    this.onError = null;             // Called when server sends ERROR
    this.onConnectionChange = null;  // Called when connection status changes
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket URL (default: ws://localhost:3000)
   */

  connect(url = 'ws://localhost:3000') {
    console.log('Connecting to server...');
    
    this.ws = new WebSocket(url);

    // ===== CONNECTION OPENED =====
    this.ws.onopen = () => {
      console.log('Connected to server');
      this.isConnected = true;
      
      if (this.onConnectionChange) {
        this.onConnectionChange(true);
      }
    };

    // ===== MESSAGE RECEIVED =====
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received:', message.type);

        // Handle different message types
        switch (message.type) {
          case 'GAME_STATE':
            this.handleGameState(message);
            break;

          case 'ERROR':
            this.handleError(message);
            break;

          default:
            console.warn('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    };

    // ===== CONNECTION CLOSED =====
    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      
      if (this.onConnectionChange) {
        this.onConnectionChange(false);
      }
    };

    // ===== CONNECTION ERROR =====
    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
  }

  /**
   * Handle GAME_STATE message from server
   * @param {object} message - Game state message
   */
  handleGameState(message) {
    // Store gameId when we first receive it
    if (message.gameId && !this.gameId) {
      this.gameId = message.gameId;
      console.log('🎮 Game ID:', this.gameId);
    }

    // Forward to UI/scene via callback
    if (this.onGameStateUpdate) {
      this.onGameStateUpdate(message);
    }
  }

  /**
   * Handle ERROR message from server
   * @param {object} message - Error message
   */
  handleError(message) {
    console.error('⚠️ Server error:', message.message);
    
    // Forward to error handler via callback
    if (this.onError) {
      this.onError(message.message);
    }
  }

  /**
   * Send NEW_GAME message to server
   * @param {number} playerCount - Number of players (1-4)
   */
  startNewGame(playerCount = 1) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return;
    }

    console.log('🎮 Starting new game with', playerCount, 'player(s)');
    
    const message = {
      type: 'NEW_GAME',
      playerCount: playerCount
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send FLIP_CARD message to server
   * @param {string} cardId - ID of the card to flip
   */
  flipCard(cardId) {
    if (!this.isConnected) {
      console.error('❌ Not connected to server');
      return;
    }

    if (!this.gameId) {
      console.error('❌ No active game');
      return;
    }

    console.log('🃏 Flipping card:', cardId);
    
    const message = {
      type: 'FLIP_CARD',
      gameId: this.gameId,
      cardId: cardId
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.gameId = null;
      this.isConnected = false;
    }
  }
}

// Create singleton instance
const gameClient = new GameClient();

// Export for use in other modules
export default gameClient;