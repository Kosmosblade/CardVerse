import React, { memo } from 'react';
import CardItem from './CardItem'; // Assuming CardItem is a separate component that handles individual cards

// Memoized grid rendering to prevent unnecessary re-renders
const CardGrid = memo(({ inventory, onCardClick, onCardDelete, onCardHover, flippedCards, onCardFlip, loading }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
      {loading ? (
        <p className="col-span-full text-center text-blue-300">Loading...</p>
      ) : inventory.length === 0 ? (
        <p className="col-span-full text-center text-blue-400">No cards in inventory.</p>
      ) : (
        inventory.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            onClick={onCardClick}
            onDelete={onCardDelete}
            onHover={onCardHover}
            flipped={flippedCards[card.id]}  // Pass flipped state for each card
            onFlip={() => onCardFlip(card.id)}  // Flip handler
          />
        ))
      )}
    </div>
  );
});

export default CardGrid;
