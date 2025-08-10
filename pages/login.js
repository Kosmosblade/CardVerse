// File: pages/login.js
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    setLoading(true);

    try {
      const leaked = await isLeaked(password);
      if (leaked) {
        setMessage('This password has been found in a data breach. Please use a different password.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Leaked password check failed:', err);
      setMessage('Error checking password security. Try again later.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profileData) {
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              username: data.user.email.split('@')[0],
              subscription_type: 'free',
              max_cards: 200,
              current_card_count: 0,
              subscription_start: new Date().toISOString(),
              subscription_updated_at: new Date().toISOString(),
            },
          ]);

        if (insertProfileError) {
          setMessage('Error creating profile: ' + insertProfileError.message);
          setLoading(false);
          return;
        }
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (updateError || !updatedProfile) {
        setMessage('Error fetching profile data after login.');
        setLoading(false);
        return;
      }

      const totalCardCount = updatedProfile.current_card_count;
      const maxCardLimit = updatedProfile.subscription_type === 'free' ? 200 : 600;

      setMessage(`Logged in successfully. Card count: ${totalCardCount} / ${maxCardLimit}`);
      setLoading(false);

      router.push('/inventory');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[#0b1f3a] text-white rounded-lg shadow-md border border-blue-800">
      <h2 className="text-2xl text-center mb-4 style-romain font-bold text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">Log In</h2>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          className="p-3 bg-black text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />
        <input
          type="password"
          className="p-3 bg-black text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="relative w-40 h-12 rounded-full overflow-hidden transition transform hover:scale-105 focus:outline-none"
            aria-label="Log In"
          >
            {loading && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <span className="inline-block w-5 h-5 border-4 border-indigo-300 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src="/assets/login.png"
              alt="Log In"
              className="w-full h-full object-contain"
              draggable={false}
            />
          </button>
        </div>

        {message && (
          <p className="text-sm text-red-400 text-center" role="alert" aria-live="assertive">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
