import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null); // For error handling
  const [message, setMessage] = useState(''); // For success or error message after subscription upgrade

  // Fetch user and profile data
  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        setUser(null);
        setError('Failed to fetch user data');
      } else {
        setUser(data?.user ?? null);
        console.log('User fetched:', data?.user);

        // Fetch subscription info from the profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_type, max_cards, current_card_count, subscription_end')
          .eq('id', data?.user?.id)
          .single();  // We expect a single profile for the logged-in user

        if (profileError) {
          console.error('Error fetching subscription info:', profileError.message);
          setSubscription(null);
          setError('Failed to fetch subscription data');
        } else {
          console.log('Profile data fetched:', profileData);
          setSubscription(profileData);
        }
      }
    }

    getUser();
  }, []);

  // Upgrade the user's subscription type
  const handleUpgrade = async () => {
    if (!subscription) return;

    // Update the user's subscription type and max_cards field
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_type: 'premium',
        max_cards: 600,  // Set max_cards to 600 for premium users
      })
      .eq('id', user.id);

    if (error) {
      setMessage('Error upgrading subscription: ' + error.message);
    } else {
      setMessage('Successfully upgraded to Premium!');
      setSubscription((prev) => ({ 
        ...prev, 
        subscription_type: 'premium',
        max_cards: 600  // Update the max_cards locally too
      }));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[#0b1f3a] text-white rounded-lg shadow-md border border-blue-800">
      <h2 className="text-2xl font-bold mb-4 text-blue-200">My Profile</h2>
      
      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}
      
      {message && (
        <p className={`text-sm ${message.includes('successful') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}

      {user ? (
        <div className="space-y-3">
          <p><strong>ID:</strong> <span className="text-gray-300">{user.id}</span></p>
          <p><strong>Email:</strong> <span className="text-gray-300">{user.email}</span></p>
          <p><strong>Created:</strong> <span className="text-gray-300">{new Date(user.created_at).toLocaleString()}</span></p>
          
          {subscription ? (
            <div className="mt-4">
              <p><strong>Subscription Type:</strong> <span className="text-gray-300">{subscription.subscription_type}</span></p>
              <p><strong>Max Cards:</strong> <span className="text-gray-300">{subscription.max_cards}</span></p>
              <p><strong>Cards in Inventory:</strong> <span className="text-gray-300">{subscription.current_card_count}</span></p>
              {subscription.subscription_end && (
                <p><strong>Subscription Ends:</strong> <span className="text-gray-300">{new Date(subscription.subscription_end).toLocaleString()}</span></p>
              )}

              {/* Upgrade Button - Only show it if the subscription is 'free' */}
              {subscription.subscription_type === 'free' && (
                <button
                  onClick={handleUpgrade}
                  className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition mt-4"
                >
                  Upgrade to Premium
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-400">Subscription info not available.</p>
          )}
        </div>
      ) : (
        <p className="text-gray-400">Loading user info...</p>
      )}
    </div>
  );
}
