import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';

const Card = memo(function Card({ card, count = 1, returnUrl }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isOracleExpanded, setIsOracleExpanded] = useState(false);

  useEffect(() => {
    if (card) {
      const imageUrl =
        card.image_uris?.normal ||
        card.card_faces?.[0]?.image_uris?.normal ||
        '/placeholder.jpg';
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

  // Build href with returnUrl param if exists
  const href = {
    pathname: `/card/${card.id}`,
    query: {},
  };
  if (returnUrl) {
    href.query.returnUrl = returnUrl;
  }

  const oracleText = card?.oracle_text || 'No oracle text available';

  // Improved price extraction logic:
  // Try prices.usd, prices.usd_foil, prices.usd_etched, or card_faces prices if multi-faced card
  let price = null;
  if (card.prices) {
    if (card.prices.usd && !isNaN(parseFloat(card.prices.usd))) {
      price = parseFloat(card.prices.usd).toFixed(2);
    } else if (card.prices.usd_foil && !isNaN(parseFloat(card.prices.usd_foil))) {
      price = parseFloat(card.prices.usd_foil).toFixed(2);
    } else if (card.prices.usd_etched && !isNaN(parseFloat(card.prices.usd_etched))) {
      price = parseFloat(card.prices.usd_etched).toFixed(2);
    }
  }
  // Check if card_faces have prices (for double-faced cards)
  if (!price && card.card_faces?.length) {
    for (const face of card.card_faces) {
      if (face?.prices?.usd && !isNaN(parseFloat(face.prices.usd))) {
        price = parseFloat(face.prices.usd).toFixed(2);
        break;
      } else if (face?.prices?.usd_foil && !isNaN(parseFloat(face.prices.usd_foil))) {
        price = parseFloat(face.prices.usd_foil).toFixed(2);
        break;
      }
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
