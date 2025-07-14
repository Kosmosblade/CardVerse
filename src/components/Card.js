import React from 'react';
import { Link } from 'react-router-dom';

export default function Card({ card, count = 1 }) {
  if (!card) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col items-center text-center border border-gray-200">
        <div className="h-44 w-full bg-gray-200 rounded-md mb-4 flex items-center justify-center text-gray-400">
          No Data
        </div>
        <div className="text-lg font-bold text-gray-900">Unknown Card</div>
        <div className="text-indigo-600 font-semibold mt-1">x{count}</div>
      </div>
    );
  }

  const oracleText = card.oracle_text || 'No oracle text available';
  const price = card.prices?.usd ? parseFloat(card.prices.usd).toFixed(2) : null;
  const colors = card.color_identity.length ? card.color_identity.join(", ") : "N/A";

  return (
    <Link
      to={`/card/${card.id}`}
      state={{ card }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 p-4 flex flex-col items-center text-center border border-gray-200 dark:border-gray-700 cursor-pointer select-text"
    >
      {(card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal) && (
        <img
          src={card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal}
          alt={card.name}
          className="mb-3 rounded-md shadow-md w-full max-h-[310px] object-cover"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://via.placeholder.com/223x310?text=No+Image";
          }}
        />
      )}

      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{card.name}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {card.set_name} • {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
      </p>

      {price && (
        <p className="mt-2 text-emerald-500 font-semibold text-lg">
          ${price}
        </p>
      )}

      <div className="text-sm mt-1">
        <strong>Mana Cost:</strong> {card.mana_cost || "N/A"}
      </div>

      <div className="text-sm mt-1">
        <strong>Colors:</strong> {colors}
      </div>

      <p
        className="text-xs text-gray-500 dark:text-gray-400 mt-3 max-h-[4.5em] overflow-hidden text-ellipsis line-clamp-3 hover:line-clamp-none transition-all duration-300"
        title={oracleText}
      >
        {oracleText}
      </p>

      <div className="text-indigo-600 font-semibold mt-2">x{count}</div>
    </Link>
  );
}
