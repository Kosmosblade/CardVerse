import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Correct paths for your styles
import '../styles/Background.css'; 

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { name: 'Browse Cards', to: '/' },
    { name: 'My Decks', to: '/decks' },
    { name: 'Inventory', to: '/inventory' },
    { name: 'About', to: '/about' },
    { name: 'Login', to: '/login' },
    { name: 'Signup', to: '/signup' },
    { name: 'Profile', to: '/profile' },
    { name: 'Logout', to: '/logout' },
  ];

  return (
    <div>
      {/* Floating button to open the nav */}
      {!menuOpen && (
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="fixed right-4 bottom-4 z-50 p-0 bg-transparent border-none focus:outline-none"
          aria-label="Open Menu"
        >
          <img 
            src={`${process.env.PUBLIC_URL}/assets/menu-icon.png`} 
            alt="Menu Icon" 
            className="w-8 h-8 object-cover"
            onError={(e) => e.target.src = '/assets/default-icon.png'} // Fallback image
          />
        </button>
      )}

      {/* Slide-out Navbar */}
      <nav
        className={`fixed top-0 right-0 h-full w-64 shadow-lg transform ${menuOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300`}
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/assets/navbar-background.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: 'rgba(0, 0, 0, 0.4)', // Add subtle dark overlay for better contrast
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={`${process.env.PUBLIC_URL}/assets/logo.png`} 
              alt="CardVerse Logo"
              className="h-12 w-auto drop-shadow-md"
            />
            <span className="text-3xl font-extrabold text-white tracking-wide select-none">
              Card<span className="text-indigo-500">Verse</span>
            </span>
          </Link>

          {/* Close button (X) */}
          <button
            onClick={() => setMenuOpen(false)}
            className="text-white hover:bg-gray-200 p-2 rounded-md md:hidden"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col space-y-4 px-6 py-2">
          {links.map(({ name, to }) => (
            <li key={to}>
              <Link
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`text-lg font-medium text-gray-200 hover:text-indigo-500 transition duration-200 ${location.pathname === to ? 'text-indigo-500 font-bold' : ''} hover:underline hover:underline-offset-4`}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
