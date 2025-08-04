import React from 'react';

export default function About() {
  return (
    <div className="text-center py-10 max-w-4xl mx-auto px-4">
      <h2 className="text-3xl font-bold text-yellow-400 mb-4">Conjurers Crypt</h2>
      <p className="text-white-700 text-lg leading-relaxed mb-4">
        <strong>Conjurers Crypt</strong> is your ultimate Magic: The Gathering companion — built by players, for players. Whether you're a casual collector or a competitive deckbuilder, Conjurers Crypt brings your card library to life with powerful, intuitive tools.
      </p>
      <p className="text-white-700 text-lg leading-relaxed mb-4">
        Seamlessly <strong>search the entire MTG catalog</strong>, explore alternate prints and art, and instantly see prices and availability. Save your favorites, track your inventory, and monitor collection size in real time.
      </p>
      <p className="text-white-700 text-lg leading-relaxed mb-4">
        Build and manage decks with precision, thanks to integrated filters, advanced search, and future tools like color balance, mana curve analysis, and synergy scoring.
      </p>
      <p className="text-white-700 text-lg leading-relaxed mb-6">
        Conjurers Crypt is more than a database — it’s a personal hub for organizing, discovering, and enjoying the Magic multiverse. And we're just getting started.
      </p>
      <div className="text-sm text-red-500">
        Conjurers Crypt uses data provided by{' '}
        <a
          href="https://scryfall.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Scryfall
        </a>
        . Magic: The Gathering and its respective properties are copyright Wizards of the Coast. This site is not produced, affiliated, or endorsed by Wizards of the Coast.
      </div>
    </div>
  );
}
