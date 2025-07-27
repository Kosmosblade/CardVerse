import React from 'react';
import Card from './Card'; // Assuming you have this card component already

export default function SearchResults({ results }) {
  if (!results.length) {
    return <p className="mt-6 text-center text-gray-400">No cards found.</p>;
  }

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {results.map((card) => (
        <Card key={card.id} card={card} />
      ))}
    </div>
  );
}
