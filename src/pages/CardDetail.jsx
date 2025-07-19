import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CardDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [card, setCard] = useState(state?.card || null);
  const [print] = useState(state?.print || null); // Removed setPrint
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(!state?.card);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(id)}`);
        const data = await response.json();
        setCard(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching card:', error);
        setLoading(false);
      }
    };

    if (!card && id) {
      fetchCard();
    }
  }, [card, id]);

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Loading card data...</p>
      </div>
    );
  }

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

  const image =
    print?.image_uris?.normal ||
    print?.card_faces?.[0]?.image_uris?.normal ||
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    'https://via.placeholder.com/223x310?text=No+Image';

  const oracleText =
    print?.oracle_text ||
    card.oracle_text ||
    (card.card_faces ? card.card_faces.map(face => face.oracle_text).join('\n\n') : 'No description available.');

  const rawPrice = print?.prices?.usd || card?.prices?.usd || null;
  const price = rawPrice ? `$${parseFloat(rawPrice).toFixed(2)}` : 'N/A';
  const numericPrice = rawPrice ? parseFloat(rawPrice) : 0;

  const colors = card.color_identity?.length ? card.color_identity.join(', ') : 'Colorless';

  const legalityList = card.legalities
    ? Object.entries(card.legalities)
        .map(([format, status]) => ({
          format: format.charAt(0).toUpperCase() + format.slice(1),
          status: status.charAt(0).toUpperCase() + status.slice(1),
        }))
        .sort((a, b) => a.format.localeCompare(b.format))
    : [];

  const handleAddToInventory = async () => {
    setAdding(true);
    setMessage(null);

    const name = print?.name || card.name;
    const image_url =
      print?.image_uris?.normal ||
      print?.card_faces?.[0]?.image_uris?.normal ||
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal ||
      null;

    const back_image_url =
      print?.card_faces?.[1]?.image_uris?.normal ||
      card.card_faces?.[1]?.image_uris?.normal ||
      null;

    const set_name = print?.set_name || card.set_name || null;
    const scryfall_uri = print?.scryfall_uri || card.scryfall_uri || null;

    const { error } = await supabase.from('inventory').insert([
      {
        name,
        quantity: Number(quantity),
        image_url,
        back_image_url,
        set_name,
        scryfall_uri,
        price: numericPrice,
      },
    ]);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to add to inventory' });
      console.error(error);
    } else {
      setMessage({ type: 'success', text: `${name} added to inventory!` });
      setQuantity(1);
    }

    setAdding(false);
  };

  return (
    <div className="max-w-6xl mx-auto mt-12 px-6 py-8 bg-[#112b4a] text-white rounded-xl shadow-2xl">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-shrink-0">
          <img
            src={image}
            alt={print?.name || card.name}
            className="w-[280px] rounded-lg shadow-lg border border-blue-800"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/223x310?text=No+Image';
            }}
          />
        </div>

        <div className="flex-1 space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight">{print?.name || card.name}</h1>
          <p className="text-sm text-blue-200">
            {print?.set_name || card.set_name} •{' '}
            {print?.rarity || card.rarity?.charAt(0).toUpperCase() + card.rarity?.slice(1)}
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

          <div className="mt-6 bg-[#0b1f3a] p-4 rounded-xl shadow-inner border border-blue-900">
            <p className="text-lg font-semibold mb-2 text-blue-200">Add to Inventory</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20 px-2 py-1 rounded border text-black"
              />
              <button
                onClick={handleAddToInventory}
                disabled={adding}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded"
              >
                {adding ? 'Adding...' : 'Add to Inventory'}
              </button>
            </div>
            {message && (
              <p
                className={`mt-2 text-sm ${
                  message.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Back to Search
            </button>

            {card?.prints_search_uri && (
              <button
                onClick={() => navigate('/card-prints', { state: { card } })}
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
