import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { name: 'Browse Cards', to: '/' },
    { name: 'My Decks', to: '/decks' },
    { name: 'Inventory', to: '/inventory' },
    { name: 'About', to: '/about' },
  ];

  return (
    <header className="bg-white/90 backdrop-blur border-b shadow-md sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/assets/logo.png"
            alt="CardVerse Logo"
            className="h-12 w-auto drop-shadow-md"
          />
          <span className="text-3xl font-extrabold text-blue-600 tracking-wide select-none">
            Card<span className="text-indigo-500">Verse</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex space-x-8 font-medium text-lg text-gray-700">
          {links.map(({ name, to }) => (
            <Link
              key={to}
              to={to}
              className={`hover:text-blue-600 transition duration-200 ${
                location.pathname === to ? 'text-blue-600 font-bold' : ''
              }`}
            >
              {name}
            </Link>
          ))}
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <nav className="md:hidden bg-white border-t border-gray-200 shadow-inner">
          <ul className="flex flex-col space-y-2 py-4 px-6 text-gray-700 font-medium">
            {links.map(({ name, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`block hover:text-blue-600 transition duration-200 ${
                    location.pathname === to ? 'text-blue-600 font-bold' : ''
                  }`}
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
