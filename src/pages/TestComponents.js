// src/pages/TestComponents.js
import React from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function TestComponents() {
  return (
    <div className="min-h-screen bg-midnight text-white flex items-center justify-center px-4">
      <div className="card-glow max-w-md w-full space-y-6 p-6 rounded-cardverse">
        <h1 className="text-2xl font-bold text-center">TestComponents Loaded</h1>
        <Input placeholder="Enter something..." />
        <Button>Click Me</Button>
      </div>
    </div>
  );
}
