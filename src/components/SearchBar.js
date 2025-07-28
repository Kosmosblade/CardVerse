import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ query, setQuery, setCards }) {
  const navigate = useNavigate();

  const sendDiscordWebhook = async (card) => {
    const payload = {
      username: 'CardVerse Bot',
      embeds: [
        {
          title: `Card Searched: ${card.name}`,
          url: card.scryfall_uri,
          description: card.oracle_text || 'No description',
          color: 7506394,
          fields: [
            { name: 'Set', value: card.set_name || 'N/A', inline: true },
            { name: 'Rarity', value: card.rarity || 'N/A', inline: true },
            { name: 'Price (USD)', value: card.prices?.usd || 'N/A', inline: true },
          ],
          thumbnail: { url: card.image_uris?.small || '' },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      await fetch(
        'https://discord.com/api/webhooks/1393842813128671293/P1QfMYz7uAiTnwXLdTjRBc5iFQlrFKy00jrYUaH6tf12htO3t45eOtn9in082ieQFPbd',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
    } catch (err) {
      console.error('Discord webhook failed:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(trimmedQuery)}`
      );
      const data = await res.json();

      if (data.object === 'error') {
        alert('Card not found');
        setCards([]);
        return;
      }

      setCards([data]);
      await sendDiscordWebhook(data);
    } catch (error) {
      console.error('Error fetching card:', error);
      alert('Error fetching card data. Check console for details.');
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="flex shadow-lg rounded-lg overflow-hidden fixed top-4 left-4 z-50 w-[380px]"
    >
      <input
        type="text"
        placeholder="Search card by exact name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="px-4 py-2 w-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-l-lg"
        aria-label="Search cards by exact name"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search"
      >
        Search
      </button>
      <button
        type="button"
        onClick={() => navigate('/advanced-search')}
        className="bg-gray-700 text-white px-4 py-2 text-sm rounded-r-lg hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-gray-600 ml-1"
        aria-label="Advanced Search"
      >
        Advanced
      </button>
    </form>
  );
}
