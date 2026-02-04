export default function sanitizeGameState(gameState) {
  const flippedSet = new Set(gameState.flippedCardIds);

  const sanitizedCards = gameState.cards.map((card) => {
    const shouldRevealValue = card.isMatched || flippedSet.has(card.id);

    if (shouldRevealValue) {
      return {
        id: card.id,
        isMatched: card.isMatched,
        value: card.value, // Only revealed for flipped/matched cards
      };
    }

    return {
      id: card.id,
      isMatched: card.isMatched,
      // value is intentionally omitted for face-down cards
    };
  });

  return {
    gameId: gameState.gameId,
    status: gameState.status,
    lockBoard: gameState.lockBoard,
    flippedCardIds: gameState.flippedCardIds,
    activePlayerIndex: gameState.activePlayerIndex,
    players: gameState.players.map((player) => ({
      id: player.id,
      color: player.color,
      score: player.score,
    })),
    cards: sanitizedCards,
  };
}
