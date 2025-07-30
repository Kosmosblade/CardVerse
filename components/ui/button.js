import React from 'react';

export const Button = ({ children, className = '', ...props }) => (
  <button
    className={`btn bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition duration-200 ease-in-out ${className}`}
    {...props}
  >
    {children}
  </button>
);
