// src/components/AdvancedFilters.js
import React from 'react';

export default function AdvancedFilters({ filters, setFilters }) {
  const handleChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleColor = (color) => {
    setFilters((prev) => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter((c) => c !== color)
        : [...prev.colors, color],
    }));
  };

  return (
    <div className="bg-white p-4 mt-20 ml-4 shadow-xl rounded-lg w-80 fixed z-40">
      <h3 className="text-lg font-semibold mb-2">Advanced Filters</h3>

      {/* Set Name Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Set Name</label>
        <input
          type="text"
          value={filters.set || ''}
          onChange={(e) => handleChange('set', e.target.value)}
          className="w-full px-3 py-1 mt-1 border border-gray-300 rounded"
          placeholder="e.g. Final Fantasy"
        />
      </div>

      {/* Color Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Colors</label>
        <div className="flex flex-wrap gap-2">
          {['W', 'U', 'B', 'R', 'G'].map((color) => (
            <label key={color} className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={filters.colors.includes(color)}
                onChange={() => toggleColor(color)}
              />
              <span>{color}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Rarity Filter */}
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Rarity</label>
        <select
          value={filters.rarity || ''}
          onChange={(e) => handleChange('rarity', e.target.value)}
          className="w-full px-3 py-1 border border-gray-300 rounded"
        >
          <option value="">Any</option>
          <option value="common">Common</option>
          <option value="uncommon">Uncommon</option>
          <option value="rare">Rare</option>
          <option value="mythic">Mythic</option>
        </select>
      </div>
    </div>
  );
}
