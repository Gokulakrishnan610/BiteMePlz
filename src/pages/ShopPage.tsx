import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Package, AlertCircle, Store, Clock, ArrowLeft, ShoppingCart, MapPin, Zap, Search, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  is_available: boolean;
}

interface Shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  image: string;
  is_open: boolean;
  final_validity_time: string;
}


const ShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchShopAndProducts = async () => {
      try {
        const [shopResponse, productsResponse] = await Promise.all([
          axios.get(`/api/shops/${id}`),
          axios.get(`/api/products`, {
            params: {
              shop: id
            }
          })
        ]);
        setShop(shopResponse.data);
        // Get all products, not just available ones, but filter them properly
        const allProducts = productsResponse.data || [];
        setProducts(allProducts.filter((product: Product) => product.is_available));
        setLoading(false);
      } catch (err) {
        setError('Failed to load shop data');
        setLoading(false);
      }
    };

    if (id) {
      fetchShopAndProducts();
    }
  }, [id]);

  const isShopAcceptingOrders = () => {
    if (!shop) return false;
    
    return shop.is_open;
  };


  const getTimeUntilClosure = () => {
    if (!shop) return null;
    
    const now = new Date();
    const finalValidity = new Date(shop.final_validity_time);
    const timeDiff = finalValidity.getTime() - now.getTime();

    
    if (timeDiff <= 0) return null;
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (!isShopAcceptingOrders()) {
      toast.error('Shop is no longer accepting orders for today');
      return;
    }

    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }

    addToCart(
      {
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: 1,
        stock: product.stock
      },
      shop!._id
    );
    toast.success('Added to cart');
  };

  // Get unique categories from products, filtering out undefined/null values
  const validCategories = products
    .map(product => product.category)
    .filter(category => category && typeof category === 'string');
  
  const categories = ['all', ...new Set(validCategories)];

  const categoryLabels: { [key: string]: string } = {
    all: 'All Products',
    food: 'Food',
    beverages: 'Beverages',
    snacks: 'Snacks',
    stationery: 'Stationery',
    electronics: 'Electronics',
    others: 'Others'
  };

  // Filter products based on category and search query
  const filteredProducts = products.filter(product => {
    // Category filter
    const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    
    // Search filter
    const searchMatch = searchQuery.length === 0 || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return categoryMatch && searchMatch;
  });

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)] flex items-center justify-center">
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

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)] flex items-center justify-center">
        <div className="text-center card p-8 max-w-md">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)] mb-4 text-lg">{error || 'Shop not found'}</p>
          <Link to="/" className="btn-primary">
            Back to Shops
          </Link>
        </div>
      </div>
    );
  }

  const shopAcceptingOrders = isShopAcceptingOrders();
  const timeUntilClosure = getTimeUntilClosure();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--primary-bg)] via-[var(--secondary-bg)] to-[var(--primary-bg)]">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 mb-8 group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Shops
        </Link>

        {/* Shop Header */}
        <div className="card mb-8 overflow-hidden">
          <div className="relative">
            <div className="aspect-video md:aspect-[3/1] w-full overflow-hidden">
              <img
                src={shop.image || 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg'}
                alt={shop.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>
            
            {/* Shop Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] rounded-lg">
                      <Store className="text-white" size={24} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold">{shop.name}</h1>
                  </div>
                  <p className="text-lg text-gray-200 mb-2">{shop.description}</p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <MapPin size={16} />
                      <span>{shop.location}</span>
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md ${
                  shopAcceptingOrders 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {shopAcceptingOrders ? 'Open' : 'Closed'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shop Status Messages */}
        {!shopAcceptingOrders ? (
          <div className="mb-8 card p-6">
            <div className="flex items-center">
              <AlertCircle className="text-red-400 mr-4 flex-shrink-0" size={32} />
              <div>
                <p className="text-red-400 font-semibold text-lg mb-1">Shop is closed for orders</p>
                <p className="text-[var(--secondary-text)]">Orders are no longer being accepted for today.</p>
              </div>
            </div>
          </div>
        ) : timeUntilClosure && (
          <div className="mb-8 card p-6 border border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center">
              <Clock className="text-yellow-400 mr-4 flex-shrink-0" size={32} />
              <div>
                <p className="text-yellow-400 font-semibold text-lg mb-1">
                  Shop closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                </p>
                <p className="text-[var(--secondary-text)]">Complete your order before the shop closes.</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-[var(--muted-text)]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="input pl-10 pr-10 w-full"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--muted-text)] hover:text-[var(--accent-purple)]"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter - Only show when there are products */}
        {products.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white shadow-lg'
                      : 'bg-[var(--card-bg)] text-[var(--secondary-text)] border border-[var(--border-color)] hover:border-[var(--accent-purple)] hover:text-[var(--accent-purple)]'
                  }`}
                >
                  {categoryLabels[category] || (category && typeof category === 'string' ? category.charAt(0).toUpperCase() + category.slice(1) : 'Unknown')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mb-6 text-center">
            <p className="text-[var(--secondary-text)]">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found for "{searchQuery}"
              {selectedCategory !== 'all' && ` in ${categoryLabels[selectedCategory] || selectedCategory}`}
            </p>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="card p-12 max-w-md mx-auto">
              <Package size={64} className="text-[var(--muted-text)] mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-[var(--secondary-text)] mb-4">
                {searchQuery ? 'No Products Found' : 'No Products Available'}
              </h3>
              <p className="text-[var(--muted-text)]">
                {searchQuery 
                  ? `No products match your search "${searchQuery}"${selectedCategory !== 'all' ? ` in ${categoryLabels[selectedCategory] || selectedCategory}` : ''}.`
                  : selectedCategory === 'all' 
                  ? "This shop doesn't have any products yet." 
                  : `No products found in the ${categoryLabels[selectedCategory] || selectedCategory} category.`}
              </p>
              {(searchQuery || selectedCategory !== 'all') && (
                <div className="mt-4 space-x-2">
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="btn-secondary text-sm"
                    >
                      Clear Search
                    </button>
                  )}
                  {selectedCategory !== 'all' && (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="btn-secondary text-sm"
                    >
                      View All Products
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <div 
                key={product._id} 
                className="card hover:scale-105 transition-all duration-300 glow-hover overflow-hidden group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Product Image */}
                <div className="relative aspect-square w-full overflow-hidden">
                  <img
                    src={product.image || 'https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg'}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary-bg)]/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Category Badge */}
                  {product.category && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-md bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border border-[var(--accent-purple)]/30">
                      {categoryLabels[product.category] || product.category}
                    </div>
                  )}

                  {/* Stock Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-md ${
                    product.stock > 0 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {product.stock > 0 ? `${product.stock} left` : 'Out of stock'}
                  </div>

                  {/* Quick Add Button */}
                  {product.stock > 0 && shopAcceptingOrders && (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-violet)] text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg"
                    >
                      <ShoppingCart size={16} />
                    </button>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-[var(--primary-text)] mb-2 group-hover:text-[var(--accent-purple)] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-[var(--secondary-text)] text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold gradient-text">₹{product.price}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0 || !shopAcceptingOrders}
                    className={`w-full py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                      (product.stock === 0 || !shopAcceptingOrders)
                        ? 'bg-[var(--border-color)] text-[var(--muted-text)] cursor-not-allowed'
                        : 'btn-primary hover:shadow-lg'
                    }`}
                  >
                    <ShoppingCart size={18} />
                    <span>
                      {product.stock === 0 
                        ? 'Out of Stock' 
                        : !shopAcceptingOrders 
                        ? 'Shop Closed' 
                        : 'Add to Cart'}
                    </span>
                  </button>
                </div>

              
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
