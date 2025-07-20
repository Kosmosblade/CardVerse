import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Check against HaveIBeenPwned leaked password database
  const isLeaked = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    const text = await res.text();

    return text.includes(suffix);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const leaked = await isLeaked(password);
      if (leaked) {
        setMessage('This password has been found in a data breach. Please use a different password.');
        return;
      }
    } catch (err) {
      console.error('Leaked password check failed:', err);
      setMessage('Error checking password security. Try again later.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[#0b1f3a] text-white rounded-lg shadow-md border border-blue-800">
      <h2 className="text-2xl font-bold mb-4 text-blue-200">Log In</h2>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          className="p-3 bg-black text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          type="password"
          className="p-3 bg-black text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
        >
          Log In
        </button>
        {message && (
          <p className="text-sm text-red-400">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
