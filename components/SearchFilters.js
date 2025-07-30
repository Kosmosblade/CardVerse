import React from 'react';

export default function SearchFilters({ filters = {}, onChange }) {
  // Provide safe defaults in case filters props is incomplete
  const {
    name = '',
    set = '',
    type = '',
    colors = [],
    manaCost = '',
    rarity = '',
    power = '',
    toughness = '',
    text = '',
    layout = '',
    format = '',
    priceMin = '',
    priceMax = '',
    styles = [],
    availability = [],
  } = filters;

  const colorOptions = ['W', 'U', 'B', 'R', 'G', 'C'];

  // Handles simple input/select changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  // Toggle color checkboxes
  const handleColorToggle = (color) => {
    let newColors = [...colors];
    if (newColors.includes(color)) {
      newColors = newColors.filter((c) => c !== color);
    } else {
      newColors.push(color);
    }
    onChange('colors', newColors);
  };

  // Handles toggling checkbox arrays (like styles and availability)
  const handleToggleInArray = (field, item) => {
    let newArray = [...(filters[field] || [])];
    if (newArray.includes(item)) {
      newArray = newArray.filter((i) => i !== item);
    } else {
      newArray.push(item);
    }
    onChange(field, newArray);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
      {/* Card Name */}
      <div>
        <label className="block font-semibold mb-1 text-white">Card Name</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={handleInputChange}
          placeholder="Exact or partial name"
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        />
      </div>

      {/* Set */}
      <div>
        <label className="block font-semibold mb-1 text-white">Set</label>
        <input
          type="text"
          name="set"
          value={set}
          onChange={handleInputChange}
          placeholder="Set code or name"
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block font-semibold mb-1 text-white">Card Type</label>
        <input
          type="text"
          name="type"
          value={type}
          onChange={handleInputChange}
          placeholder="Creature, Instant, etc."
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        />
      </div>

      {/* Colors */}
      <div>
        <label className="block font-semibold mb-1 text-white">Color Identity</label>
        <div className="flex gap-2">
          {colorOptions.map((color) => (
            <label key={color} className="flex items-center gap-1 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={colors.includes(color)}
                onChange={() => handleColorToggle(color)}
                className="accent-blue-500"
              />
              {color}
            </label>
          ))}
        </div>
      </div>

      {/* Mana Cost */}
      <div>
        <label className="block font-semibold mb-1 text-white">Mana Cost (CMC)</label>
        <input
          type="number"
          min="0"
          name="manaCost"
          value={manaCost}
          onChange={handleInputChange}
          placeholder="Converted Mana Cost"
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        />
      </div>

      {/* Rarity */}
      <div>
        <label className="block font-semibold mb-1 text-white">Rarity</label>
        <select
          name="rarity"
          value={rarity}
          onChange={handleInputChange}
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        >
          <option value="">Any</option>
          <option value="common">Common</option>
          <option value="uncommon">Uncommon</option>
          <option value="rare">Rare</option>
          <option value="mythic">Mythic</option>
        </select>
      </div>

      {/* Power */}
      <div>
        <label className="block font-semibold mb-1 text-white">Power</label>
        <input
          type="text"
          name="power"
          value={power}
          onChange={handleInputChange}
          placeholder="e.g. 2, *, >3"
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        />
      </div>

      {/* Toughness */}
      <div>
        <label className="block font-semibold mb-1 text-white">Toughness</label>
        <input
          type="text"
          name="toughness"
          value={toughness}
          onChange={handleInputChange}
          placeholder="e.g. 2, *, >3"
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        />
      </div>

      {/* Text / Oracle Text */}
      <div className="md:col-span-2">
        <label className="block font-semibold mb-1 text-white">Card Text / Oracle Text</label>
        <input
          type="text"
          name="text"
          value={text}
          onChange={handleInputChange}
          placeholder="Search text inside card rules"
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        />
      </div>

      {/* Layout */}
      <div>
        <label className="block font-semibold mb-1 text-white">Layout</label>
        <select
          name="layout"
          value={layout}
          onChange={handleInputChange}
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        >
          <option value="">Any</option>
          <option value="normal">Normal</option>
          <option value="split">Split</option>
          <option value="flip">Flip</option>
          <option value="adventure">Adventure</option>
          <option value="transform">Transform</option>
          <option value="meld">Meld</option>
          <option value="leveler">Leveler</option>
          <option value="saga">Saga</option>
          <option value="planar">Planar</option>
          <option value="scheme">Scheme</option>
          <option value="vanguard">Vanguard</option>
          <option value="token">Token</option>
          <option value="double_faced_token">Double Faced Token</option>
          <option value="emblem">Emblem</option>
          <option value="augment">Augment</option>
          <option value="host">Host</option>
        </select>
      </div>

      {/* Format Legality */}
      <div>
        <label className="block font-semibold mb-1 text-white">Format Legality</label>
        <select
          name="format"
          value={format}
          onChange={handleInputChange}
          className="w-full rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
        >
          <option value="">Any</option>
          <option value="standard">Standard</option>
          <option value="historic">Historic</option>
          <option value="pioneer">Pioneer</option>
          <option value="modern">Modern</option>
          <option value="legacy">Legacy</option>
          <option value="pauper">Pauper</option>
          <option value="vintage">Vintage</option>
          <option value="commander">Commander</option>
          <option value="brawl">Brawl</option>
          <option value="duel">Duel</option>
          <option value="oldschool">Old School</option>
        </select>
      </div>

      {/* Price Range */}
      <div>
        <label className="block font-semibold mb-1 text-white">Price Range (USD)</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            name="priceMin"
            value={priceMin}
            onChange={handleInputChange}
            placeholder="Min"
            className="w-1/2 rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
          />
          <input
            type="number"
            min="0"
            name="priceMax"
            value={priceMax}
            onChange={handleInputChange}
            placeholder="Max"
            className="w-1/2 rounded border border-gray-600 px-3 py-2 bg-[#1e293b] text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Card Styles */}
      <div>
        <label className="block font-semibold mb-1 text-white">Card Styles</label>
        <div className="flex flex-wrap gap-2">
          {['normal', 'foil', 'etched', 'showcase', 'borderless', 'extendedart', 'retro'].map((style) => {
            const checked = styles.includes(style);
            return (
              <label key={style} className="flex items-center gap-1 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleInArray('styles', style)}
                  className="accent-blue-400"
                />
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </label>
            );
          })}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="block font-semibold mb-1 text-white">Availability</label>
        <div className="flex gap-2">
          {['paper', 'arena', 'mtgo'].map((avail) => {
            const checked = availability.includes(avail);
            return (
              <label key={avail} className="flex items-center gap-1 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleToggleInArray('availability', avail)}
                  className="accent-blue-400"
                />
                {avail.charAt(0).toUpperCase() + avail.slice(1)}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
