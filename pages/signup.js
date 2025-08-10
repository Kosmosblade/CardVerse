import { useState } from 'react';
import { supabase } from '../lib/supabase'; // adjust path if needed

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const leaked = await isLeaked(password);
      if (leaked) {
        setMessage('This password has been found in a data breach. Please choose a more secure password.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Leaked password check failed:', err);
      setMessage('Error checking password security. Try again later.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: data.user.id, username }]);

      if (profileError) {
        setMessage('Signup succeeded but failed to save username: ' + profileError.message);
      } else {
        setMessage('Signup successful! Check your email to confirm.');
      }
    } else {
      setMessage('Signup successful! Check your email to confirm.');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[#0b1f3a] text-white rounded-lg shadow-md border border-blue-800">
      
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
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
          autoComplete="new-password"
        />
        <input
          type="text"
          className="p-3 bg-black text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        {/* Sign Up Button */}
        <div className="flex justify-center mt-4">
          <button
            type="submit"
            disabled={loading}
            className={`bg-transparent p-0 border-0 rounded hover:opacity-90 transition duration-300 ${
              loading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="text-white text-sm">Signing up...</span>
            ) : (
              <img
                src="/assets/signup.png"
                alt="Sign Up"
                className="h-14 w-auto pointer-events-none"
              />
            )}
          </button>
        </div>

        {/* Message Output */}
        {message && (
          <p
            className={`text-sm text-center mt-2 ${
              message.toLowerCase().includes('successful')
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
