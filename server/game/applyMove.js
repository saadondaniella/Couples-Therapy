

const DEFAULT_REVEAL_DELAY_MS = 800;

export default function applyMove(gameState, cardId, revealDelayMs = DEFAULT_REVEAL_DELAY_MS) {
  // ===== VALIDATION =====
  
  if (gameState.status !== "playing") {
    return { error: "Game is not active." };
  }

//   if (gameState.lockBoard) {
//     return { error: "Board is locked. Wait for cards to flip back." };
//   }

  const clickedCard = gameState.cards.find((card) => card.id === cardId);
  if (!clickedCard) {
    return { error: "Invalid cardId." };
  }

  if (clickedCard.isMatched) {
    return { error: "Card is already matched." };
  }

  if (gameState.flippedCardIds.includes(cardId)) {
    return { error: "Card is already flipped." };
  }

  if (gameState.flippedCardIds.length >= 2) {
    return { error: "You can only flip two cards." };
  }

  // ===== FLIP THE CARD (IMMUTABLY) =====
  
  const updatedFlippedCardIds = [...gameState.flippedCardIds, cardId];

  // If only 1 card is flipped, nothing more to do
  if (updatedFlippedCardIds.length === 1) {
    return { 
      gameState: {
        ...gameState,
        flippedCardIds: updatedFlippedCardIds
      }, 
      needsDelayAction: false 
    };
  }

  // ===== TWO CARDS FLIPPED: CHECK MATCH =====
  
  const [firstId, secondId] = updatedFlippedCardIds;
  const firstCard = gameState.cards.find((card) => card.id === firstId);
  const secondCard = gameState.cards.find((card) => card.id === secondId);

  // Safety check (should never happen)
  if (!firstCard || !secondCard) {
    return { 
      error: "Internal error: flipped cards not found.",
      gameState: {
        ...gameState,
        flippedCardIds: []
      }
    };
  }

  const isMatch = firstCard.value === secondCard.value;

  if (isMatch) {
    // ===== MATCH! =====
    
    // Mark cards as matched (immutably)
    const updatedCards = gameState.cards.map((card) => {
      if (card.id === firstId || card.id === secondId) {
        return { ...card, isMatched: true };
      }
      return card;
    });

    // Increase score for active player (immutably)
    const updatedPlayers = gameState.players.map((player, index) => {
      if (index === gameState.activePlayerIndex) {
        return { ...player, score: player.score + 1 };
      }
      return player;
    });

    // Check win condition
    const allMatched = updatedCards.every((card) => card.isMatched);
    const newStatus = allMatched ? "won" : "playing";

    return {
      gameState: {
        ...gameState,
        cards: updatedCards,
        players: updatedPlayers,
        flippedCardIds: [],
        lockBoard: false,
        status: newStatus
        // activePlayerIndex stays the same - player keeps turn!
      },
      needsDelayAction: false
    };
  }

  // ===== NO MATCH =====
  
  // Advance to next player (immutably)
  const nextPlayerIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;

  return {
    gameState: {
      ...gameState,
      flippedCardIds: updatedFlippedCardIds,
      lockBoard: true,
      activePlayerIndex: nextPlayerIndex
    },
    needsDelayAction: true,
    delayMs: revealDelayMs
  };
}

    
export function unlockBoard(gameState) {
  return {
    ...gameState,
    flippedCardIds: [],
    lockBoard: false
  };
}