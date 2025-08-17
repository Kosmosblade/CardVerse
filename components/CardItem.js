import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';

const Card = memo(function CardItem({ card, count = 1, returnUrl }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [isOracleExpanded, setIsOracleExpanded] = useState(false);

  useEffect(() => {
    if (card) {
      const imageUrl =
        card.image_uris?.normal ||
        card.card_faces?.[0]?.image_uris?.normal ||
        card.displayedImage || // fallback if your inventory has a 'displayedImage' prop
        '/placeholder.jpg';
      setImageSrc(imageUrl);
    }
  }, [card]);

  if (!card) {
    return (
      <div className="bg-gray-900 rounded-2xl shadow-lg p-4 flex flex-col items-center text-center border border-gray-700 text-white">
        <div className="h-44 w-full bg-gray-800 rounded-md mb-4 flex items-center justify-center text-gray-400">
          No Data
        </div>
        <div className="text-lg font-bold">Unknown Card</div>
        <span className="bubble mt-2 select-none">x{count}</span>
      </div>
    );
  }

  // ---------- Build CardDetail link ----------
  const href = { pathname: `/card/[id]`, query: {} };
  href.query.id = card.scryfall_id || card.id || card.name || 'unknown';
  if (returnUrl) href.query.returnUrl = returnUrl;

  if (card.set) href.query.set = card.set;
  if (card.collector_number) href.query.cn = card.collector_number;
  if (card.finish) href.query.finish = card.finish;

  const styleParts = [];
  if (card.borderless) styleParts.push('borderless');
  if (card.showcase) styleParts.push('showcase');
  if (card.extended_art) styleParts.push('extended');
  if (card.foil) styleParts.push('foil');
  if (styleParts.length) href.query.style = styleParts.join(',');

  const oracleText =
    card.oracle_text || card.card_faces?.[0]?.oracle_text || 'No oracle text available';

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

  const colors = card.color_identity?.length
    ? card.color_identity.join(', ')
    : null;
  const rarity = card.rarity
    ? card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)
    : null;

  return (
    <Link href={href} passHref>
      <div
        className="bg-black bg-opacity-90 rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 p-4 flex flex-col items-center text-center border border-gray-700 cursor-pointer select-text text-white"
        aria-label={`View details for ${card.name || card.card_name || 'Unknown'}`}
        onMouseLeave={() => setIsOracleExpanded(false)}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={card.name || card.card_name || 'Card image'}
            className="mb-3 rounded-md shadow-md w-full max-h-[310px] object-contain"
            loading="lazy"
            onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.jpg'; }}
            draggable={false}
          />
        ) : (
          <div className="h-44 w-full bg-gray-800 rounded-md mb-4 flex items-center justify-center text-gray-400">
            No Image Available
          </div>
        )}

        <h2 className="text-xl font-bold text-white truncate w-full">
          {card.name || card.card_name || 'Unknown'}
        </h2>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {rarity && <span className="bubble text-white">{rarity}</span>}
          {colors && <span className="bubble text-white">{colors}</span>}
        </div>

        <p className="text-sm text-gray-400 mt-1 truncate w-full" title={card.set_name || card.set || 'Unknown Set'}>
          {card.set_name || card.set || 'Unknown Set'}
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

        {/* Variant badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-40">
          {card.extended_art && (
            <span className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded">Extended</span>
          )}
          {card.borderless && (
            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">Borderless</span>
          )}
          {card.showcase && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">Showcase</span>
          )}
          {card.foil && (
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Foil</span>
          )}
        </div>
      </div>
    </Link>
  );
});

export default Card;
