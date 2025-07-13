import React from 'react';

export default function SearchBar({ query, setQuery, handleSearch }) {
  return (
    <form onSubmit={handleSearch} className="flex shadow-md rounded-lg overflow-hidden">
      <input
        type="text"
        placeholder="Search card by exact name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="px-5 py-3 w-72 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-l-lg"
        aria-label="Search cards by exact name"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-3 rounded-r-lg hover:bg-blue-700 active:bg-blue-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search"
      >
        Search
      </button>
    </form>
  );
}
