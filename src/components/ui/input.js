// src/components/ui/input.js
import React from 'react';

export const Input = ({ className = '', ...props }) => (
  <input
    className={`input border border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);
