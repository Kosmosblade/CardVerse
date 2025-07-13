// === STEP 1: Create postcss.config.js in your project root ===
// File: postcss.config.js

module.exports = {
  plugins: [
    require('@tailwindcss/postcss7-compat'),
    require('autoprefixer'),
  ],
};


// === STEP 2: Create index.js in the /src folder ===
// File: src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
