import React from 'react';
import Card from './Card';

export default function SearchResults({ results = [], returnUrl }) {
  if (!results.length) {
    return (
      <p className="mt-6 text-center text-gray-400 select-none">
        No cards found.
      </p>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {results.map((card) => (
        <Card key={card.id} card={card} returnUrl={returnUrl} />
      ))}
    </div>
  );
}
