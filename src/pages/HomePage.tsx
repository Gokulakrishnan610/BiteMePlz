import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Store } from 'lucide-react';

interface Shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  image: string;
}

const HomePage: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const { data } = await axios.get('/api/shops');
        setShops(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (err) {
        setError('Failed to load shops');
        setLoading(false);
      }
    };

    fetchShops();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
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
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Campus Kiosk</h1>
        <p className="text-[var(--gray-600)] text-lg max-w-2xl mx-auto">
          Discover and shop from various campus stores. Quick, easy, and convenient shopping experience right at your fingertips.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shops.map((shop) => (
          <Link
            key={shop._id}
            to={`/shop/${shop._id}`}
            className="card hover:shadow-lg transition-shadow duration-300"
          >
            <div className="aspect-video w-full overflow-hidden rounded-t-lg">
              <img
                src={shop.image || 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg'}
                alt={shop.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center mb-2">
                <Store className="text-[var(--primary)] mr-2" size={20} />
                <h3 className="text-xl font-semibold">{shop.name}</h3>
              </div>
              <p className="text-[var(--gray-600)] mb-2">{shop.description}</p>
              <p className="text-sm text-[var(--gray-500)]">
                <span className="font-medium">Location:</span> {shop.location}
              </p>
            </div>
          </Link>
        ))}
      </section>

      {shops.length === 0 && (
        <div className="text-center py-12">
          <Store size={48} className="text-[var(--gray-400)] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-[var(--gray-600)] mb-2">
            No Shops Available
          </h2>
          <p className="text-[var(--gray-500)]">
            Please check back later for available shops.
          </p>
        </div>
      )}
    </div>
  );
};

export default HomePage;