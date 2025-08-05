// components/SearchBar.js
import React from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Card from './Card';

export default function SearchBar({ query, setQuery, handleSearch, cards = [] }) {
  const router = useRouter();

  return (
    <>
      {/* Fixed search bar */}
      <form
        onSubmit={handleSearch}
        className="fixed top-8 left-1/2 z-50 flex w-[380px] transform -translate-x-1/2 shadow-lg rounded-lg overflow-hidden bg-gray-800"
        role="search"
        aria-label="Card search form"
      >
        <input
          type="text"
          placeholder="Search card by exact name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-grow px-4 py-2 text-sm text-white placeholder-gray-400 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          onClick={() => router.push('/advanced-search')}
          className="bg-gray-700 text-white px-4 py-2 text-sm hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-gray-600"
          aria-label="Advanced Search"
        >
          Advanced
        </button>
      </form>

      {/* Results container - same width as search bar, horizontally centered */}
      <div
        className="mt-4 mx-auto w-[380px] pt-[60px]" // pt to clear the fixed bar height
        style={{ minHeight: '1px' }} // ensure container always exists for AnimatePresence
      >
        <AnimatePresence>
          {cards.length > 0 && (
            <motion.div
              key="search-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 gap-6"
              aria-live="polite"
            >
              {cards.map((card) => (
                <Card key={card.id} card={card} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
