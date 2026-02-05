
    import gameClient from './client.js';

    // ===== GAME STATE =====
    let currentGameState = null;

    // ===== CONNECT TO SERVER =====
    gameClient.connect();

    // ===== CONNECTION STATUS =====
    gameClient.onConnectionChange = (isConnected) => {
      const statusEl = document.getElementById('connectionStatus');
      if (isConnected) {
        statusEl.className = 'status connected';
        statusEl.textContent = '✅ Connected to server';
      } else {
        statusEl.className = 'status disconnected';
        statusEl.textContent = '❌ Disconnected from server';
      }
    };

    // ===== GAME STATE UPDATE =====
    gameClient.onGameStateUpdate = (gameState) => {
      console.log('Game state:', gameState);
      currentGameState = gameState;
      
      // Update game info
      updateGameInfo(gameState);
      
      // Render cards
      renderCards(gameState);
    };

    // ===== ERROR HANDLING =====
    gameClient.onError = (errorMessage) => {
      const errorBox = document.getElementById('errorBox');
      errorBox.innerHTML = `<div class="error">❌ ${errorMessage}</div>`;
      setTimeout(() => {
        errorBox.innerHTML = '';
      }, 3000);
    };

    // ===== UPDATE GAME INFO =====
    function updateGameInfo(gameState) {
      const info = document.getElementById('gameInfo');
      
      const activePlayer = gameState.players[gameState.activePlayerIndex];
      const playerScores = gameState.players
        .map(p => `${p.color}: ${p.score}`)
        .join(' | ');
      
      info.innerHTML = `
        <strong>Game ID:</strong> ${gameState.gameId}<br>
        <strong>Status:</strong> ${gameState.status}<br>
        <strong>Active Player:</strong> <span style="color: ${activePlayer.color}">${activePlayer.color}</span><br>
        <strong>Scores:</strong> ${playerScores}
      `;
    }

    // ===== RENDER CARDS =====
    function renderCards(gameState) {
      const grid = document.getElementById('cardGrid');
      grid.innerHTML = '';
      
      gameState.cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        
        // Show value if face up
        if (card.isFaceUp && card.value) {
          cardEl.textContent = card.value;
          cardEl.classList.add('faceup');
        } else {
          cardEl.textContent = '?';
        }
        
        // Mark matched cards
        if (card.isMatched) {
          cardEl.classList.add('matched');
        }
        
        // Click handler
        cardEl.addEventListener('click', () => {
          if (!card.isMatched && currentGameState.status === 'playing') {
            gameClient.flipCard(card.id);
          }
        });
        
        grid.appendChild(cardEl);
      });
    }

    // ===== START GAME FUNCTION =====
    window.startGame = (playerCount) => {
      gameClient.startNewGame(playerCount);
    };
