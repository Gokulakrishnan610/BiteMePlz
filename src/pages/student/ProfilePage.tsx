import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get('/api/users/profile');
        setProfile(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <User size={32} className="text-[var(--primary)] mr-3" />
              <h1 className="text-2xl font-bold">Profile</h1>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Name
                </label>
                <p className="text-lg">{profile.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Email
                </label>
                <p className="text-lg">{profile.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Role
                </label>
                <p className="text-lg capitalize">{profile.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;