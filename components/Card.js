import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';

const Card = memo(function Card({ card, count = 1, returnUrl }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isOracleExpanded, setIsOracleExpanded] = useState(false);

  useEffect(() => {
    if (card) {
      // Prefer specific print images if available
      let imageUrl = null;

      if (card.image_uris?.normal) {
        imageUrl = card.image_uris.normal;
      } else if (Array.isArray(card.card_faces)) {
        // Combine first face normal
        imageUrl = card.card_faces[0]?.image_uris?.normal;
      }

      // Fallback
      if (!imageUrl) imageUrl = '/placeholder.jpg';

      setImageSrc(imageUrl);
    }
  }, [card]);

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

  // Build link with exact print info
  const href = { pathname: `/card/${card.id}`, query: {} };
  if (returnUrl) href.query.returnUrl = returnUrl;
  if (card.set && card.collector_number) {
    href.query.set = card.set;
    href.query.cn = card.collector_number;
  }
  if (card.finish) href.query.finish = card.finish;

  const oracleText = card?.oracle_text || card?.card_faces?.[0]?.oracle_text || 'No oracle text available';

  const getPrice = (prices) => {
    if (!prices) return null;
    const raw = prices.usd || prices.usd_foil || prices.usd_etched;
    return raw && !isNaN(parseFloat(raw)) ? parseFloat(raw).toFixed(2) : null;
  };

  let price = getPrice(card.prices);
  if (!price && card.card_faces?.length) {
    for (const face of card.card_faces) {
      price = getPrice(face?.prices);
      if (price) break;
    }
  }

  const colors = card?.color_identity?.length
    ? card.color_identity.join(', ')
    : null;
  const rarity = card?.rarity
    ? card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)
    : null;

  return (
    <Link href={href} passHref>
      <div
        className="bg-black bg-opacity-90 rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 p-4 flex flex-col items-center text-center border border-gray-700 cursor-pointer select-text text-white"
        aria-label={`View details for ${card.name}`}
        onMouseLeave={() => setIsOracleExpanded(false)}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={card.name}
            className="mb-3 rounded-md shadow-md w-full max-h-[310px] object-contain"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder.jpg';
            }}
            draggable={false}
          />
        ) : (
          <div className="h-44 w-full bg-gray-200 rounded-md mb-4 flex items-center justify-center text-gray-400">
            No Image Available
          </div>
        )}

        <h2 className="text-xl font-bold text-white truncate w-full">{card.name}</h2>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {rarity && <span className="bubble text-white">{rarity}</span>}
          {colors && <span className="bubble text-white">{colors}</span>}
        </div>

        <p className="text-sm text-gray-400 mt-1 truncate w-full" title={card.set_name}>
          {card.set_name || 'Unknown Set'}
        </p>

        {price !== null ? (
          <p className="mt-2 text-emerald-500 font-semibold text-lg">${price}</p>
        ) : (
          <p className="mt-2 text-gray-400 font-semibold text-lg">Price N/A</p>
        )}

        <div className="text-sm mt-1 text-white truncate w-full" title={card.mana_cost || 'N/A'}>
          <strong>Mana Cost:</strong> {card.mana_cost || 'N/A'}
        </div>

        <p
          className={`text-xs text-gray-300 mt-3 w-full transition-all duration-300 cursor-pointer select-text ${
            isOracleExpanded
              ? 'max-h-full whitespace-pre-wrap overflow-visible line-clamp-none'
              : 'max-h-[4.5em] overflow-hidden line-clamp-3'
          }`}
          title={!isOracleExpanded ? oracleText : undefined}
          onMouseEnter={() => setIsOracleExpanded(true)}
          onFocus={() => setIsOracleExpanded(true)}
          onMouseLeave={() => setIsOracleExpanded(false)}
          onBlur={() => setIsOracleExpanded(false)}
        >
          {oracleText}
        </p>

        <span className="bubble mt-2 select-none text-white">x{count || 0}</span>
      </div>
    </Link>
  );
});

export default Card;
