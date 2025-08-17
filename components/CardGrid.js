import React, { memo } from 'react';
import CardItem from './CardItem';

const CardGrid = memo(({
  inventory = [],
  onCardClick,
  onCardDelete,
  onCardHover,
  flippedCards = {},
  onCardFlip,
  loading = false
}) => {
  // Helper: pick the correct image for each card
  const getCardImage = (card) => {
    if (card.image_url) return card.image_url; // exact print from inventory
    if (card.image_uris?.normal) return card.image_uris.normal; // standard Scryfall image
    if (card.card_faces?.length) return card.card_faces[0].image_uris?.normal || '/placeholder.jpg'; // first face fallback
    return '/placeholder.jpg';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-4 justify-items-center">
      {loading ? (
        <p className="col-span-full text-center text-blue-300">Loading...</p>
      ) : inventory.length === 0 ? (
        <p className="col-span-full text-center text-blue-400">No cards in inventory.</p>
      ) : (
        inventory.map((card) => (
          <CardItem
            key={card.id}
            card={{ ...card, imageSrc: getCardImage(card) }}
            onClick={onCardClick}
            onDelete={onCardDelete}
            onHover={onCardHover}
            flipped={!!flippedCards[card.id]}
            onFlip={onCardFlip}
          />
        ))
      )}
    </div>
  );
});

export default CardGrid;
