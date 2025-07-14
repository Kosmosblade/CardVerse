import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function CardDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const card = state?.card;

  if (!card) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Card data not found.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  console.log("Card data: ", card); // Log to verify card data
  console.log("prints_search_uri: ", card?.prints_search_uri); // Log prints_search_uri

  const image =
    card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || 'https://via.placeholder.com/223x310?text=No+Image';
  const oracleText = card.oracle_text || card.card_faces?.map(face => face.oracle_text).join('\n\n') || 'No description available.';
  const price = card.prices?.usd ? `$${parseFloat(card.prices.usd).toFixed(2)}` : 'N/A';
  const colors = card.color_identity?.length ? card.color_identity.join(', ') : 'Colorless';

  const legalityList = card.legalities
    ? Object.entries(card.legalities)
        .map(([format, status]) => ({
          format: format.charAt(0).toUpperCase() + format.slice(1),
          status: status.charAt(0).toUpperCase() + status.slice(1),
        }))
        .sort((a, b) => a.format.localeCompare(b.format))
    : [];

  // Handle the view prints button click
  const handleViewPrints = () => {
    // Log the card data before navigating to ensure proper state
    console.log("Navigating to View Prints with card:", card);
    navigate('/card-prints', { state: { card } });
  };

  return (
    <div className="max-w-6xl mx-auto mt-12 px-6 py-8 bg-[#112b4a] text-white rounded-xl shadow-2xl">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Card Image */}
        <div className="flex-shrink-0">
          <img
            src={image}
            alt={card.name}
            className="w-[280px] rounded-lg shadow-lg border border-blue-800"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/223x310?text=No+Image';
            }}
          />
        </div>

        {/* Card Info */}
        <div className="flex-1 space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">{card.name}</h1>
          <p className="text-sm text-blue-200">
            {card.set_name} • {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
          </p>
          <p className="text-emerald-400 font-semibold text-xl">Price: {price}</p>

          <div className="text-sm text-blue-100 space-y-1">
            <p><strong>Type:</strong> {card.type_line || 'N/A'}</p>
            <p><strong>Mana Cost:</strong> {card.mana_cost || 'N/A'}</p>
            <p><strong>Colors:</strong> {colors}</p>
            <p><strong>Artist:</strong> {card.artist || 'Unknown'}</p>
          </div>

          <div>
            <p className="font-semibold text-indigo-300 mt-4">Oracle Text:</p>
            <p className="whitespace-pre-wrap text-blue-100 text-sm">{oracleText}</p>
          </div>

          {/* Formats Legality */}
          {legalityList.length > 0 && (
            <div className="mt-6">
              <p className="font-semibold text-indigo-300">Format Legalities:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 text-sm gap-1 mt-2">
                {legalityList.map(({ format, status }) => (
                  <div
                    key={format}
                    className={`px-2 py-1 rounded text-center ${
                      status === 'Legal'
                        ? 'bg-green-700 text-white'
                        : status === 'Banned'
                        ? 'bg-red-700 text-white'
                        : 'bg-gray-600 text-white'
                    }`}
                  >
                    {format}: {status}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Back to Search
            </button>

            {/* Conditional button visibility */}
            {card?.prints_search_uri && (
              <button
                onClick={handleViewPrints}
                className="px-4 py-2 bg-pink-600 text-white font-bold rounded-full shadow-lg hover:bg-pink-700 transition-all duration-300"
              >
                View Prints
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
