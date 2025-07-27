import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ query, setQuery, handleSearch }) {
  const navigate = useNavigate();

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
