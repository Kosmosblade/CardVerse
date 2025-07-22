// src/components/SearchBar.js
import React from 'react';

export default function SearchBar({ query, setQuery, handleSearch }) {
  return (
    <form
      onSubmit={handleSearch}
      className="flex shadow-lg rounded-lg overflow-hidden fixed top-4 left-4 z-50 w-80"
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
        className="bg-blue-600 text-white px-4 py-2 text-sm rounded-r-lg hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search"
      >
        Search
      </button>
    </form>
  );
}
