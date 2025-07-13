import React from 'react';

export default function Card({ card }) {
  const oracleText = card.oracle_text || 'No oracle text available';
  const price = card.prices?.usd ? parseFloat(card.prices.usd).toFixed(2) : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 p-4 flex flex-col items-center text-center border border-gray-200 dark:border-gray-700">
      {card.image_uris?.normal && (
        <img
          src={card.image_uris.normal}
          alt={card.name}
          className="mb-3 rounded-md shadow-md max-h-64 w-full object-contain"
        />
      )}

      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{card.name}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {card.set_name} • {card.rarity}
      </p>

      {price && (
        <p className="mt-2 text-emerald-500 font-semibold text-lg">
          ${price}
        </p>
      )}

      <p
        className="text-xs text-gray-500 dark:text-gray-400 mt-3 max-h-[4.5em] overflow-hidden text-ellipsis line-clamp-3 hover:line-clamp-none transition-all duration-300 cursor-pointer select-text"
        title={oracleText}
      >
        {oracleText}
      </p>
    </div>
  );
}
