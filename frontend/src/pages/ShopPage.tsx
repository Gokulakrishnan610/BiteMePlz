"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import api from "../api"
import { Package, AlertCircle, Store, Clock, ArrowLeft, ShoppingCart, MapPin, Search, X, Star } from "lucide-react"
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import toast from "react-hot-toast"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import Navbar from "../components/Navbar"
import SimpleLoading from "../components/SimpleLoading"

interface Product {
  _id: string
  name: string
  description: string
  category: string
  price: number
  stock: number
  image: string
  is_available: boolean
}

interface Shop {
  _id: string
  name: string
  description: string
  location: string
  image: string
  is_open: boolean
  final_validity_time: string
}

const ShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const { addToCart } = useCart()

  useEffect(() => {
    const fetchShopAndProducts = async () => {
      try {
        const [shopResponse, productsResponse] = await Promise.all([
          api.get(`/api/shops/${id}/`),
          api.get(`/api/products/`, {
            params: {
              shop: id,
            },
          }),
        ])
        setShop(shopResponse.data)
        const allProducts = productsResponse.data.results || []
        setProducts(allProducts.filter((product: Product) => product.is_available))
        setLoading(false)
      } catch (err) {
        setError("Failed to load shop data")
        setLoading(false)
      }
    }

    if (id) {
      fetchShopAndProducts()
    }
  }, [id])

  const isShopAcceptingOrders = () => {
    if (!shop) return false
    return shop.is_open
  }

  const getTimeUntilClosure = () => {
    if (!shop) return null

    const now = new Date()
    const final_validity = new Date(shop.final_validity_time)
    const timeDiff = final_validity.getTime() - now.getTime()

    if (timeDiff <= 0) return null

    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

    return { hours, minutes }
  }

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error("Please login to add items to cart")
      navigate("/login")
      return
    }
    if (!isShopAcceptingOrders()) {
      toast.error("Shop is no longer accepting orders for today")
      return
    }
    if (product.stock === 0) {
      toast.error("Product is out of stock")
      return
    }
    addToCart({
      product_id: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      stock: product.stock,
      shop_id: shop!._id,
      shop_name: shop!.name,
    })
    toast.success("Added to cart")
  }

  // Get unique categories from products that are available and have stock
  const validCategories = products
    .filter((product) => product.is_available && product.stock > 0)
    .map((product) => product.category)
    .filter((category) => category && typeof category === "string")

  const categories = ["all", ...new Set(validCategories)].filter(Boolean)

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      all: "All Products",
      food: "Food",
      beverages: "Beverages",
      snacks: "Snacks",
      stationery: "Stationery",
      electronics: "Electronics",
      others: "Others",
    }
    
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1)
  }

  const filteredProducts = products.filter((product) => {
    const categoryMatch = selectedCategory === "all" || product.category === selectedCategory

    const searchMatch =
      searchQuery.length === 0 ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()))

    return categoryMatch && searchMatch
  })

  const clearSearch = () => {
    setSearchQuery("")
  }

  if (loading) {
    return <SimpleLoading />
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 md:pt-32">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <Card className="max-w-md w-full">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                  <p className="text-red-600 mb-4 text-lg">{error || "Shop not found"}</p>
                  <Link to="/">
                    <Button className="bg-purple-600 hover:bg-purple-700">Back to Shops</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const shopAcceptingOrders = isShopAcceptingOrders()
  const timeUntilClosure = getTimeUntilClosure()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="pt-20 md:pt-32">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Back Button - Mobile */}
          <div className="flex items-center mb-8 md:hidden">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-purple-600 hover:text-purple-700 transition-colors mr-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-medium">Back</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Shop Details</h1>
          </div>

          {/* Back Button - Laptop (Parallel to Navbar) */}
          <div className="hidden md:flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-purple-600 hover:text-purple-700 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-medium">Back</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Shop Details</h1>
            <div className="w-20"></div> {/* Spacer for balance */}
          </div>

          {/* Shop Header */}
          <Card className="mb-8 overflow-hidden">
            <div className="relative">
              <div className="aspect-video md:aspect-[3/1] w-full overflow-hidden">
                <img
                  src={shop.image || "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"}
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
                      <div className="p-2 bg-purple-600 rounded-lg">
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
                      <div className="flex items-center space-x-1">
                        <Star size={16} className="text-yellow-400 fill-current" />
                        <span>4.8</span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={
                      shopAcceptingOrders
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    }
                  >
                    {shopAcceptingOrders ? "Open" : "Closed"}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Shop Status Messages */}
          {!shopAcceptingOrders ? (
            <Card className="mb-8 border-purple-200 bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertCircle className="text-purple-600 mr-4 flex-shrink-0" size={32} />
                  <div>
                    <p className="text-purple-800 font-semibold text-lg mb-1">Shop is closed for orders</p>
                    <p className="text-purple-700">Orders are no longer being accepted for today.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            timeUntilClosure && (
              <Card className="mb-8 border-purple-200 bg-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="text-purple-600 mr-4 flex-shrink-0" size={32} />
                    <div>
                      <p className="text-purple-800 font-semibold text-lg mb-1">
                        Shop closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                      </p>
                      <p className="text-purple-700">Complete your order before the shop closes.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-10 pr-10 bg-white text-gray-900 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter */}
          {products.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap gap-3 justify-center">
                {categories.map((category, index) => (
                  <Button
                    key={`${category || 'unknown'}-${index}`}
                    onClick={() => setSelectedCategory(category)}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={
                      selectedCategory === category
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent"
                    }
                  >
                    {getCategoryLabel(category)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results Info */}
          {searchQuery && (
            <div className="mb-6 text-center">
              <p className="text-gray-600">
                {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found for "{searchQuery}"
                {selectedCategory !== "all" && ` in ${getCategoryLabel(selectedCategory)}`}
              </p>
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Card className="max-w-md mx-auto">
                <CardContent className="p-12 text-center">
                  <Package size={64} className="text-gray-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    {searchQuery ? "No Products Found" : "No Products Available"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery
                      ? `No products match your search "${searchQuery}"${selectedCategory !== "all" ? ` in ${getCategoryLabel(selectedCategory)}` : ""}.`
                      : selectedCategory === "all"
                        ? "This shop doesn't have any products yet."
                        : `No products found in the ${getCategoryLabel(selectedCategory)} category.`}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {searchQuery && (
                      <Button key="clear-search-button" onClick={clearSearch} variant="outline">
                        Clear Search
                      </Button>
                    )}
                    {selectedCategory !== "all" && (
                      <Button key="view-all-button" onClick={() => setSelectedCategory("all")} variant="outline">
                        View All Products
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts
                .map((product, index) => (
                <Card
                  key={`product-${product._id}`}
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Product Image */}
                  <div className="relative aspect-square w-full overflow-hidden">
                    <img
                      src={product.image || "https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />

                    {/* Category Badge */}
                    {product.category && (
                      <Badge className="absolute top-3 left-3 bg-purple-600 hover:bg-purple-700 text-white text-xs">
                        {getCategoryLabel(product.category)}
                      </Badge>
                    )}

                    {/* Stock Badge */}
                    <Badge
                      className={`absolute top-3 right-3 text-xs ${
                        product.stock > 0
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
                    </Badge>

                    {/* Quick Add Button */}
                    {product.stock > 0 && shopAcceptingOrders && (
                      <Button
                        onClick={() => handleAddToCart(product)}
                        size="sm"
                        className="absolute bottom-3 right-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300"
                      >
                        <ShoppingCart size={16} />
                      </Button>
                    )}
                  </div>

                  {/* Product Info */}
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-purple-600">₹{product.price}</span>
                    </div>

                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0 || !shopAcceptingOrders}
                      className={`w-full ${
                        product.stock === 0 || !shopAcceptingOrders
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                    >
                      <ShoppingCart size={18} className="mr-2" />
                      {product.stock === 0 ? "Out of Stock" : !shopAcceptingOrders ? "Shop Closed" : "Add to Cart"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopPage