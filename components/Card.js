// src/components/Card.js
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Card({ card, count = 1 }) {
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (card) {
      const imageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
      const cachedImage = localStorage.getItem(imageUrl);

      if (cachedImage) {
        setImageSrc(cachedImage);
      } else {
        setImageSrc(imageUrl);
      }
    }
  }, [card]);

  const handleImageLoad = (url) => {
    localStorage.setItem(url, url);
  };

  if (!card) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col items-center text-center border border-gray-200">
        <div className="h-44 w-full bg-gray-200 rounded-md mb-4 flex items-center justify-center text-gray-400">
          No Data
        </div>
        <div className="text-lg font-bold text-gray-900">Unknown Card</div>
        <span className="bubble mt-2 select-none text-gray-900">x{count}</span>
      </div>
    );
  }

  const oracleText = card.oracle_text || 'No oracle text available';
  const price = card.prices?.usd ? parseFloat(card.prices.usd).toFixed(2) : 'N/A';
  const colors = card.color_identity?.length ? card.color_identity.join(', ') : 'N/A';

  return (
    <Link href={`/card/${card.id}`} passHref legacyBehavior>
      <a
        className="bg-black bg-opacity-90 rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 p-4 flex flex-col items-center text-center border border-gray-700 cursor-pointer select-text text-white"
        aria-label={`View details for ${card.name}`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={card.name}
            className="mb-3 rounded-md shadow-md w-full max-h-[310px] object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/223x310?text=No+Image';
            }}
            draggable={false}
            onLoad={() => handleImageLoad(imageSrc)}
          />
        ) : (
          <div className="h-44 w-full bg-gray-200 rounded-md mb-4 flex items-center justify-center text-gray-400">
            No Image Available
          </div>
        )}

        <h2 className="text-xl font-bold text-white">{card.name}</h2>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <span className="bubble text-white">
            {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
          </span>
          {card.color_identity && card.color_identity.length > 0 && (
            <span className="bubble text-white">{colors}</span>
          )}
        </div>

        <p className="text-sm text-gray-400 mt-1">{card.set_name}</p>

        {price !== 'N/A' && (
          <p className="mt-2 text-emerald-500 font-semibold text-lg">${price}</p>
        )}

        <div className="text-sm mt-1 text-white">
          <strong>Mana Cost:</strong> {card.mana_cost || 'N/A'}
        </div>

        <p
          className="text-xs text-gray-300 mt-3 max-h-[4.5em] overflow-hidden text-ellipsis line-clamp-3 hover:line-clamp-none transition-all duration-300"
          title={oracleText}
        >
          {oracleText}
        </p>

        <span className="bubble mt-2 select-none text-white">x{count || 0}</span>
      </a>
    </Link>
  );
}
