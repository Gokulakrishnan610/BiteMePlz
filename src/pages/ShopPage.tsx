import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Package, AlertCircle, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  isAvailable: boolean;
}

interface Shop {
  _id: string;
  name: string;
  description: string;
  location: string;
  image: string;
  isOpen: boolean;
}

const ShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setProducts(productsResponse.data.filter((product: Product) => product.isAvailable));
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

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (!shop?.isOpen) {
      toast.error('Shop is currently closed');
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

  if (loading) {
    return <Loader />;
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-[var(--error)] mb-4" size={48} />
          <p className="text-[var(--error)] mb-4">{error || 'Shop not found'}</p>
          <Link to="/" className="btn-primary">
            Back to Shops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="rounded-lg overflow-hidden mb-6">
          <img
            src={shop.image || 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg'}
            alt={shop.name}
            className="w-full h-64 object-cover"
          />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{shop.name}</h1>
            <p className="text-[var(--gray-600)] mb-2">{shop.description}</p>
            <p className="text-[var(--gray-500)]">
              <span className="font-medium">Location:</span> {shop.location}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            shop.isOpen 
              ? 'bg-[var(--success)] text-white'
              : 'bg-[var(--error)] text-white'
          }`}>
            {shop.isOpen ? 'Open' : 'Closed'}
          </div>
        </div>
      </div>

      {!shop.isOpen && (
        <div className="mb-8 p-4 bg-[var(--error)] bg-opacity-10 rounded-lg text-center">
            <p className="text-red-1000 font-medium">
            This shop is currently closed. Please check back later.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product._id} className="card hover:shadow-lg transition-shadow duration-300">
            <div className="aspect-video w-full overflow-hidden rounded-t-lg">
              <img
                src={product.image || 'https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
              <p className="text-[var(--gray-600)] mb-4">{product.description}</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-[var(--primary)]">₹{product.price}</p>
                <p className={`text-sm ${
                  product.stock > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                }`}>
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </p>
              </div>
              <button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0 || !shop.isOpen}
                className={`w-full btn-primary mt-4 ${
                  (product.stock === 0 || !shop.isOpen) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Package size={20} className="inline-block mr-2" />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="text-[var(--gray-400)] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-[var(--gray-600)] mb-2">
            No Products Available
          </h2>
          <p className="text-[var(--gray-500)]">
            This shop doesn't have any products yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShopPage;