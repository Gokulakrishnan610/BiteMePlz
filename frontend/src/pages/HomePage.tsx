import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Store, MapPin, Clock, Star, Zap, ShoppingBag, Users, TrendingUp } from 'lucide-react';

interface shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  image: string;
  is_open: boolean;
  final_validity_time: string;
}

const HomePage: React.FC = () => {
  const [shops, setshops] = useState<shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchshops = async () => {
      try {
        const { data } = await api.get('/shops');
        setshops(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (err) {
        setError('Failed to load shops');
        setLoading(false);
      }
    };

    fetchshops();
  }, []);

  const getTimeUntilClosure = (final_validity_time: string) => {
    if (!final_validity_time) return null;
    
    const now = new Date();
    const final_validity = new Date(final_validity_time);
    const timeDiff = final_validity.getTime() - now.getTime();
    
    if (timeDiff <= 0) return null;
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)]">
        <div className="flex space-x-2 text-4xl font-bold">
          <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '0ms' }}>L</span>
          <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '150ms' }}>O</span>
          <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '300ms' }}>A</span>
          <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '450ms' }}>D</span>
          <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '600ms' }}>I</span>
          <span className="animate-bounce text-[var(--accent-violet)]" style={{ animationDelay: '750ms' }}>N</span>
          <span className="animate-bounce text-[var(--accent-purple)]" style={{ animationDelay: '900ms' }}>G</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)]">
        <div className="text-center card p-8 max-w-md">
          <p className="text-[var(--error)] mb-4 text-lg">{error}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)]/10 to-[var(--accent-violet)]/10"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] glow">
                <Zap size={48} className="text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 fade-in">
              <span className="gradient-text">Campus Kiosk</span>
            </h1>
            <p className="text-xl md:text-2xl text-[var(--secondary-text)] mb-8 max-w-3xl mx-auto leading-relaxed slide-in">
              Your ultimate digital marketplace for campus shopping. Quick, convenient, and secure transactions at your fingertips.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center space-x-2 bg-[var(--card-bg)] px-6 py-3 rounded-full border border-[var(--border-color)]">
                <ShoppingBag className="text-[var(--accent-purple)]" size={20} />
                <span className="text-[var(--secondary-text)]">Easy shopping</span>
              </div>
              <div className="flex items-center space-x-2 bg-[var(--card-bg)] px-6 py-3 rounded-full border border-[var(--border-color)]">
                <Users className="text-[var(--accent-violet)]" size={20} />
                <span className="text-[var(--secondary-text)]">Campus Community</span>
              </div>
              <div className="flex items-center space-x-2 bg-[var(--card-bg)] px-6 py-3 rounded-full border border-[var(--border-color)]">
                <TrendingUp className="text-[var(--accent-purple)]" size={20} />
                <span className="text-[var(--secondary-text)]">Real-time Updates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* shops Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
            Discover Campus Stores
          </h2>
          <p className="text-[var(--secondary-text)] text-lg max-w-2xl mx-auto">
            Browse through our collection of campus shops and find everything you need
          </p>
        </div>

        {shops.length === 0 ? (
          <div className="text-center py-16">
            <div className="card p-12 max-w-md mx-auto">
              <Store size={64} className="text-[var(--muted-text)] mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-[var(--secondary-text)] mb-4">
                No shops Available
              </h3>
              <p className="text-[var(--muted-text)]">
                Please check back later for available shops.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {shops.map((shop, index) => {
              const timeUntilClosure = getTimeUntilClosure(shop.final_validity_time);
              const is_open = shop.is_open && timeUntilClosure;
              
              return (
                <Link
                  key={shop._id}
                  to={`/shop/${shop._id}`}
                  className="group card hover:scale-105 transition-all duration-300 glow-hover overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Image Container */}
                  <div className="relative aspect-video w-full overflow-hidden">
                    <img
                      src={shop.image || 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg'}
                      alt={shop.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Status Badge */}
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md ${
                      is_open 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {is_open ? 'Open' : 'Closed'}
                    </div>

                    {/* Rating Badge */}
                    <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md rounded-full px-3 py-1 flex items-center space-x-1">
                      <Star className="text-yellow-400 fill-current" size={14} />
                      <span className="text-sm font-medium text-white">4.8</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-lg">
                          <Store className="text-white" size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-[var(--primary-text)] group-hover:text-[var(--accent-purple)] transition-colors">
                          {shop.name}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[var(--secondary-text)] mb-4 line-clamp-2 leading-relaxed">
                      {shop.description}
                    </p>

                    {/* Location */}
                    <div className="flex items-center space-x-2 text-[var(--muted-text)] mb-4">
                      <MapPin size={16} />
                      <span className="text-sm font-medium">{shop.location}</span>
                    </div>

                    {/* Time Info */}
                    {timeUntilClosure && (
                      <div className="flex items-center space-x-2 text-[var(--muted-text)] mb-4">
                        <Clock size={16} />
                        <span className="text-sm">
                          Closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                        </span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                      <div className="flex items-center space-x-2 text-[var(--muted-text)]">
                        <div className={`w-2 h-2 rounded-full ${is_open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-sm">{is_open ? 'Available' : 'Closed'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-[var(--accent-purple)] font-medium group-hover:text-[var(--accent-violet)] transition-colors">
                        <span className="text-sm">Visit Store</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-purple)]/5 to-[var(--accent-violet)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
            Why Choose Campus Kiosk?
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card p-8 text-center hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[var(--primary-text)]">Lightning Fast</h3>
            <p className="text-[var(--secondary-text)]">Quick and seamless shopping experience with instant order processing</p>
          </div>
          
          <div className="card p-8 text-center hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-purple)] rounded-full flex items-center justify-center mx-auto mb-6">
                              <ShoppingBag className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[var(--primary-text)]">Easy shopping</h3>
            <p className="text-[var(--secondary-text)]">Browse, select, and purchase with just a few clicks</p>
          </div>
          
          <div className="card p-8 text-center hover:scale-105 transition-transform duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="text-white" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-4 text-[var(--primary-text)]">Campus Community</h3>
            <p className="text-[var(--secondary-text)]">Built specifically for campus life and student needs</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;