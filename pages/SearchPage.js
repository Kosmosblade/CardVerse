import React, { useState } from 'react';
import SearchBar from '../components/SearchBar';
import Card from '../components/Card';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();

      if (data.object === 'error') {
        setError('Card not found');
        setCards([]);
      } else {
        setCards([data]);
      }
    } catch (err) {
      setError('Error fetching card data');
      console.error(err);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 flex flex-col items-center">
      <form onSubmit={handleSearch} className="w-full max-w-xl">
        <SearchBar query={query} setQuery={setQuery} handleSearch={handleSearch} />
      </form>

      {loading && <p className="text-gray-500 mt-4">Loading...</p>}
      {error && <p className="text-red-500 mt-4">{error}</p>}

      <div className="mt-6 w-full flex justify-center">
        {cards.length === 0 && !loading && !error ? (
          <p className="text-center text-gray-500 text-lg italic">No cards loaded</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {cards.map((card) => (
              <Card key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
