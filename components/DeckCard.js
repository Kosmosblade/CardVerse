export default function DeckCard({ card, count }) {
  if (!card) {
    return (
      <div className="border rounded shadow p-2 flex flex-col items-center bg-white">
        <div className="w-24 h-32 bg-gray-300 flex items-center justify-center text-gray-600 text-sm">
          No Image
        </div>
        <div className="text-center font-semibold">Unknown</div>
        <div className="text-sm text-gray-600">x{count}</div>
      </div>
    );
  }

  // Get the best image URL from the card data
  function getImageUrl(card) {
    // 1. Top-level image_uris.small (normal single-faced cards)
    if (card.image_uris?.small) return card.image_uris.small;

    // 2. Double-faced or modal cards: look into card_faces[0]
    if (card.card_faces && card.card_faces.length > 0) {
      const frontFace = card.card_faces[0];
      if (frontFace.image_uris?.small) return frontFace.image_uris.small;
      if (frontFace.image_uris?.normal) return frontFace.image_uris.normal;
      if (frontFace.image_uris?.large) return frontFace.image_uris.large;
    }

    // 3. No image found
    return null;
  }

  const imageUrl = getImageUrl(card);

  return (
    <div className="border rounded shadow p-2 flex flex-col items-center bg-white">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={card.name}
          className="w-24 h-auto mb-2"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="w-24 h-32 bg-gray-300 flex items-center justify-center text-gray-600 text-sm">
          No Image
        </div>
      )}
      <div className="text-center font-semibold">{card.name}</div>
      <div className="text-sm text-gray-600">x{count}</div>
    </div>
  );
}
