"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "../api"
import { Package, ArrowLeft, AlertCircle, Plus, Minus, ShoppingCart, Star, MapPin } from "lucide-react"
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import Navbar from "../components/Navbar"

interface Product {
  _id: string
  name: string
  description: string
  price: number
  stock: number
  image: string
  shop: string
  category?: string
}

interface Shop {
  _id: string
  name: string
  location: string
}

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addToCart } = useCart()

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/products/${id}/`)
        setProduct(data)

        // Fetch shop details if shop ID is available
        if (data.shop) {
          try {
            const shopResponse = await api.get(`/api/shops/${data.shop}/`)
            setShop(shopResponse.data)
          } catch (shopError) {
            console.error("Failed to fetch shop details:", shopError)
          }
        }

        setLoading(false)
      } catch (err) {
        setError("Failed to load product")
        setLoading(false)
      }
    }

    if (id) {
      fetchProduct()
    }
  }, [id])

  const handleQuantityChange = (value: number) => {
    if (product) {
      setQuantity(Math.max(1, Math.min(value, product.stock)))
    }
  }

  const handleAddToCart = () => {
    if (!user) {
      toast.error("Please login to add items to cart")
      navigate("/login")
      return
    }
    if (!product) return
    if (product.stock === 0) {
      toast.error("Product is out of stock")
      return
    }

    addToCart({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
      stock: product.stock,
      shop_id: product.shop,
      shop_name: shop?.name || "Unknown Shop",
    })
    toast.success("Added to cart")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-32 md:pt-40">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-32 md:pt-40">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <Card className="max-w-md w-full">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                  <p className="text-red-600 mb-4 text-lg">{error || "Product not found"}</p>
                  <Button onClick={() => navigate(-1)} className="bg-purple-600 hover:bg-purple-700">
                    Go Back
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 md:pt-24">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Back Button - Mobile */}
          <div className="flex items-center mb-8 md:hidden">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-purple-600 hover:text-purple-700 transition-colors mr-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-medium">Back to Shop</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Product Details</h1>
          </div>

          {/* Back Button - Laptop (Parallel to Navbar) */}
          <div className="hidden md:flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-purple-600 hover:text-purple-700 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-medium">Back to Shop</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Product Details</h1>
            <div className="w-32"></div> {/* Spacer for balance */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Image */}
            <Card className="overflow-hidden">
              <div className="aspect-square w-full overflow-hidden">
                <img
                  src={product.image || "https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </Card>

            {/* Product Details */}
            <div className="space-y-6">
              {/* Product Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-3xl font-bold text-gray-900 mb-2">{product.name}</CardTitle>
                      {product.category && (
                        <Badge className="bg-purple-600 hover:bg-purple-700 text-white mb-4">
                          {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-lg leading-relaxed">{product.description}</p>
                </CardContent>
              </Card>

              {/* Shop Information */}
              {shop && (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full mr-4">
                        <Package className="text-purple-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                        <div className="flex items-center text-gray-600 text-sm">
                          <MapPin size={14} className="mr-1" />
                          <span>{shop.location}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Price and Stock */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Price</p>
                      <span className="text-4xl font-bold text-purple-600">₹{product.price}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Availability</p>
                      <Badge
                        className={
                          product.stock > 0
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-red-600 hover:bg-red-700 text-white"
                        }
                      >
                        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                      </Badge>
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  {product.stock > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Quantity</label>
                      <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200 w-fit">
                        <Button
                          onClick={() => handleQuantityChange(quantity - 1)}
                          disabled={quantity <= 1}
                          variant="ghost"
                          size="sm"
                          className="p-3 hover:bg-gray-200 rounded-l-lg"
                        >
                          <Minus size={16} />
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleQuantityChange(Number.parseInt(e.target.value) || 1)}
                          className="w-20 text-center border-0 bg-transparent focus:ring-0 font-semibold"
                          min="1"
                          max={product.stock}
                        />
                        <Button
                          onClick={() => handleQuantityChange(quantity + 1)}
                          disabled={quantity >= product.stock}
                          variant="ghost"
                          size="sm"
                          className="p-3 hover:bg-gray-200 rounded-r-lg"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <Button
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    className={`w-full py-4 text-lg ${
                      product.stock === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    <ShoppingCart size={20} className="mr-2" />
                    {product.stock === 0 ? "Out of Stock" : `Add ${quantity} to Cart`}
                  </Button>

                  {/* Total Price Display */}
                  {product.stock > 0 && quantity > 1 && (
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700 font-medium">Total ({quantity} items):</span>
                        <span className="text-2xl font-bold text-purple-600">
                          ₹{(product.price * quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Product Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                      <span className="text-gray-700">High Quality</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                      <span className="text-gray-700">Fast Delivery</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                      <span className="text-gray-700">Campus Pickup</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                      <span className="text-gray-700">Student Friendly</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional Information */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-xl">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Package className="text-purple-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Easy Returns</h3>
                  <p className="text-gray-600 text-sm">Return within 24 hours if not satisfied</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Star className="text-purple-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Quality Assured</h3>
                  <p className="text-gray-600 text-sm">All products are quality checked</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ShoppingCart className="text-purple-600" size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Campus Delivery</h3>
                  <p className="text-gray-600 text-sm">Free delivery within campus</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ProductPage