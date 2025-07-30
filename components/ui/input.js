import React from 'react';

export const Input = ({ className = '', ...props }) => (
  <input
    className={`input border border-gray-300 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ease-in-out ${className}`}
    {...props}
  />
);
