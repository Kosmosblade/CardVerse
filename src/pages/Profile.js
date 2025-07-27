import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        console.error('Error fetching user:', error);
        setError('Failed to fetch user data');
        return;
      }

      setUser(data.user);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(
          'username, avatar_url, subscription_type, max_card_limit, current_card_count, subscription_end'
        )
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError.message);
        setError('Failed to fetch profile data');
      } else {
        setSubscription(profileData);
        setUsername(profileData.username || '');
        setAvatarUrl(profileData.avatar_url || null);
      }
    }

    getUser();
  }, []);

  const handleUpgrade = async () => {
    if (!subscription || !user) return;

    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_type: 'premium',
        max_card_limit: 600,
        subscription_start: now.toISOString(),
        subscription_end: end.toISOString(),
        subscription_updated_at: now.toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      setMessage('Error upgrading subscription: ' + error.message);
    } else {
      setMessage('Successfully upgraded to Premium!');
      setSubscription((prev) => ({
        ...prev,
        subscription_type: 'premium',
        max_card_limit: 600,
        subscription_start: now.toISOString(),
        subscription_end: end.toISOString(),
        subscription_updated_at: now.toISOString(),
      }));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    // Unique file path: avatars/{userId}/{timestamp}.{ext}
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const filePath = `avatars/${user.id}/${timestamp}.${fileExt}`;

    setUploading(true);
    setMessage('');

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      setMessage('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }

    // Use uploadData if needed or just to avoid eslint warning
    if (uploadData) {
      // Optionally log or use uploadData here
      // console.log('Upload success:', uploadData);
    }

    // Get public URL for the uploaded file
    const { data: publicData, error: urlError } = supabase.storage.from('avatars').getPublicUrl(filePath);

    if (urlError || !publicData?.publicUrl) {
      setMessage('Failed to retrieve public avatar URL.');
      setUploading(false);
      return;
    }

    const publicUrl = publicData.publicUrl;

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      setMessage('Failed to update avatar URL in profile: ' + updateError.message);
    } else {
      setAvatarUrl(publicUrl);
      setMessage('Avatar updated successfully!');
    }

    setUploading(false);
  };

  const handleUsernameSave = async () => {
    if (!username.trim() || !user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);

    if (error) {
      setMessage('Failed to update username: ' + error.message);
    } else {
      setMessage('Username updated!');
      setSubscription((prev) => ({ ...prev, username }));
      setEditingUsername(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[#0b1f3a] text-white rounded-lg shadow-md border border-blue-800">
      <h2 className="text-2xl font-bold mb-4 text-blue-200">Account</h2>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && (
        <p
          className={`text-sm ${
            message.toLowerCase().includes('updated') || message.toLowerCase().includes('successfully')
              ? 'text-green-400'
              : 'text-red-400'
          }`}
        >
          {message}
        </p>
      )}

      {user ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <img
              src={avatarUrl || '/default-avatar.png'}
              alt="Avatar"
              className="w-17 h-16 rounded-full border border-white object-cover"
            />
            <div>
              <label className="block text-sm text-gray-300 mb-1">Change Avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="text-sm text-white"
                disabled={uploading}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white-400">Username:</label>
            {editingUsername ? (
              <div className="flex space-x-2 mt-1">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-600 w-full"
                />
                <button
                  onClick={handleUsernameSave}
                  className="text-sm bg-blue-600 px-2 rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <span className="text-gray-300">{subscription?.username || 'N/A'}</span>
                <button
                  onClick={() => setEditingUsername(true)}
                  className="text-sm text-blue-400 hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <p>
            <strong>Email:</strong> <span className="text-gray-300">{user.email}</span>
          </p>
          <p>
            <strong>Created:</strong>{' '}
            <span className="text-gray-300">{new Date(user.created_at).toLocaleString()}</span>
          </p>

          {subscription ? (
            <>
              <p>
                <strong>Subscription Type:</strong>{' '}
                <span className="text-gray-300">{subscription.subscription_type}</span>
              </p>
              <p>
                <strong>Max Cards:</strong> <span className="text-gray-300">{subscription.max_card_limit}</span>
              </p>
              <p>
                <strong>Cards in Inventory:</strong>{' '}
                <span className="text-gray-300">{subscription.current_card_count}</span>
              </p>
              {subscription.subscription_end && (
                <p>
                  <strong>Subscription Ends:</strong>{' '}
                  <span className="text-gray-300">{new Date(subscription.subscription_end).toLocaleString()}</span>
                </p>
              )}

              {subscription.subscription_type === 'free' && (
                <button
                  onClick={handleUpgrade}
                  className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition mt-4 w-full"
                >
                  Upgrade to Premium
                </button>
              )}
            </>
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
