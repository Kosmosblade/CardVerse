import React, { useState } from 'react';
import SearchBar from '../components/SearchBar';
import Card from '../components/Card';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();
      if (data.object === 'error') {
        alert('Card not found');
        setCards([]);
        return;
      }
      setCards([data]);
    } catch (error) {
      alert('Error fetching card data');
      console.error(error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <SearchBar query={query} setQuery={setQuery} handleSearch={handleSearch} />

      <div className="mt-6">
        {cards.length === 0 ? (
          <p className="text-center text-gray-500">No cards loaded</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {cards.map((card) => (
              <Card key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
