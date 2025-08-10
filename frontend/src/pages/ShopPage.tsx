"use client"

import type React from "react"
import { useEffect, useMemo, useState, useDeferredValue, useRef } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import api from "../api"
import { Package, AlertCircle, ArrowLeft, MapPin, Search, X, Star, Plus, Minus, Filter, Heart, ShoppingBag, Store, Grid3X3, ChevronRight } from 'lucide-react'
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import toast from "react-hot-toast"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../components/ui/sheet"
import { Separator } from "../components/ui/separator"
import Navbar from "../components/Navbar"
import SimpleLoading from "../components/SimpleLoading"

interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  stock: number
  image: string
  is_available: boolean
}

interface Shop {
  id: string
  name: string
  description: string
  location: string
  image: string
  is_open: boolean
  final_validity_time: string
  rating?: number
  delivery_time?: string
  delivery_fee?: number
}

interface LocalCartItem {
  productId: string
  quantity: number
  product: Product
  shopId: string
  shopName: string
}

const ShopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToCart } = useCart()

  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [allShops, setAllShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [localCart, setLocalCart] = useState<LocalCartItem[]>([])
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [sortBy, setSortBy] = useState<"relevance" | "price" | "stock">("relevance")
  const mobileSearchRef = useRef<HTMLInputElement>(null)
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set())
  const [showMultiShopNotice, setShowMultiShopNotice] = useState(false)

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem("multiShopCart")
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        setLocalCart(parsedCart)

        // Check if there are items from other shops
        const hasItemsFromOtherShops = parsedCart.some((item: LocalCartItem) => item.shopId !== id)
        if (hasItemsFromOtherShops && parsedCart.length > 0) {
          setShowMultiShopNotice(true)
          // Auto-hide after 5 seconds
          setTimeout(() => setShowMultiShopNotice(false), 5000)
        }
      } catch (error) {
        console.error("Error loading cart from localStorage:", error)
      }
    }
  }, [id])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("multiShopCart", JSON.stringify(localCart))
  }, [localCart])

  const toggleFavorite = async (productId: string) => {
    try {
      const isFav = favoriteProductIds.has(productId)
      if (isFav) {
        setFavoriteProductIds((prev) => {
          const n = new Set(prev)
          n.delete(productId)
          return n
        })
      } else {
        setFavoriteProductIds((prev) => {
          const n = new Set(prev)
          n.add(productId)
          return n
        })
      }
    } catch {}
  }

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()

    const fetchShopAndProducts = async () => {
      try {
        const [shopResponse, productsResponse, allShopsResponse] = await Promise.all([
          api.get(`/api/shops/${id}/`, { signal: controller.signal }),
          api.get(`/api/products/`, {
            params: { shop: id },
            signal: controller.signal,
          }),
          api.get(`/api/shops/`, { signal: controller.signal }),
        ])

        setShop(shopResponse.data)
        const allProducts = productsResponse.data.results || []
        setProducts(allProducts.filter((product: Product) => product.is_available))
        setAllShops(allShopsResponse.data.results || [])
        setLoading(false)
      } catch (err) {
        if ((err as any)?.name !== "CanceledError") {
          setError("Failed to load shop data")
          setLoading(false)
        }
      }
    }

    fetchShopAndProducts()
    return () => controller.abort()
  }, [id])

  const isShopAcceptingOrders = () => {
    if (!shop) return false
    return shop.is_open
  }

  const getProductQuantity = (productId: string): number => {
    const item = localCart.find((item) => item.productId === productId)
    return item ? item.quantity : 0
  }

  const handleAddToLocalCart = (product: Product) => {
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

    setLocalCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item,
        )
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            quantity: 1,
            product,
            shopId: id!,
            shopName: shop?.name || "Unknown Shop",
          },
        ]
      }
    })

    // Also add to your original cart context
    addToCart({
      id: product.id + "-" + Date.now(),
      product_id: product.id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
      stock: product.stock,
      shop_id: shop!.id,
      shop_name: shop!.name,
    })
  }

  const handleRemoveFromLocalCart = (productId: string) => {
    setLocalCart((prev) => {
      const existing = prev.find((item) => item.productId === productId)
      if (existing && existing.quantity > 1) {
        return prev.map((item) => (item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item))
      } else {
        return prev.filter((item) => item.productId !== productId)
      }
    })
  }

  const handleGoToCart = () => {
    navigate("/cart")
  }

  const handleShopNavigation = (shopId: string) => {
    navigate(`/shop/${shopId}`)
  }

  const validCategories = useMemo(
    () =>
      products
        .filter((product) => product.is_available && product.stock > 0)
        .map((product) => product.category)
        .filter((category) => category && typeof category === "string"),
    [products],
  )

  const hasFavoritesInShop = useMemo(
    () => products.some((p) => favoriteProductIds.has(p.id)),
    [products, favoriteProductIds],
  )

  const categories = useMemo(() => {
    const base = ["all"]
    if (hasFavoritesInShop) base.push("favorites")
    return [...base, ...new Set(validCategories)].filter(Boolean)
  }, [validCategories, hasFavoritesInShop])

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      all: "All Products",
      favorites: "Favorites",
      food: "Food",
      beverages: "Beverages",
      snacks: "Snacks",
      stationery: "Stationery",
      electronics: "Electronics",
      others: "Others",
    }
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1)
  }

  const deferredSearch = useDeferredValue(searchQuery)
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryMatch =
          selectedCategory === "all" ||
          (selectedCategory === "favorites" && favoriteProductIds.has(product.id)) ||
          product.category === selectedCategory

        const query = deferredSearch.trim().toLowerCase()
        const searchMatch =
          query.length === 0 ||
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          (product.category && product.category.toLowerCase().includes(query))

        return categoryMatch && searchMatch
      }),
    [products, selectedCategory, deferredSearch, favoriteProductIds],
  )

  const sortedProducts = useMemo(() => {
    if (sortBy === "price") return [...filteredProducts].sort((a, b) => a.price - b.price)
    if (sortBy === "stock") return [...filteredProducts].sort((a, b) => b.stock - a.stock)
    return filteredProducts
  }, [filteredProducts, sortBy])

  const clearSearch = () => {
    setSearchQuery("")
  }

  const totalCartItems = localCart.reduce((sum, item) => sum + item.quantity, 0)
  const totalCartValue = localCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const currentShopItems = localCart.filter((item) => item.shopId === id)
  const currentShopTotal = currentShopItems.reduce((sum, item) => sum + item.quantity, 0)
  const currentShopValue = currentShopItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const otherShopsItems = localCart.filter((item) => item.shopId !== id)
  const uniqueShops = new Set(localCart.map((item) => item.shopName)).size
  const shopsWithItems = new Set(localCart.map((item) => item.shopId))

  // Filter other shops (exclude current shop and closed shops)
  const otherShops = allShops.filter((s) => s.id !== id && s.is_open)

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
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar />

      {/* Multi-Shop Notice */}
      {showMultiShopNotice && otherShopsItems.length > 0 && (
        <div className="fixed top-16 sm:top-20 md:top-32 left-2 right-2 sm:left-4 sm:right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 shadow-lg">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-white/20 rounded-full p-1.5 sm:p-2 flex-shrink-0">
                  <Store size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm">Multi-Shop Order Active!</p>
                  <p className="text-xs text-purple-100 truncate">
                    You have items from {uniqueShops} shop{uniqueShops > 1 ? "s" : ""} in your cart
                  </p>
                </div>
                <button
                  onClick={() => setShowMultiShopNotice(false)}
                  className="text-white/80 hover:text-white flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Desktop Multi-Shop Notice */}
      {showMultiShopNotice && otherShopsItems.length > 0 && (
        <div className="hidden md:block fixed top-32 left-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="max-w-7xl mx-auto">
            <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                    <Store size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Multi-Shop Order Active!</p>
                    <p className="text-xs text-purple-100">
                      You have items from {uniqueShops} shop{uniqueShops > 1 ? "s" : ""} in your cart (₹{totalCartValue}{" "}
                      total)
                    </p>
                  </div>
                  <button
                    onClick={handleGoToCart}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                  >
                    View All Items
                  </button>
                  <button
                    onClick={() => setShowMultiShopNotice(false)}
                    className="text-white/80 hover:text-white flex-shrink-0 ml-2"
                  >
                    <X size={16} />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm sticky top-0 z-10 pt-20 sm:pt-24">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-gray-900 truncate">{shop.name}</h1>
                {uniqueShops > 1 && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                    +{uniqueShops - 1} more
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{shop.description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-transparent border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              <Store size={12} />
              More
            </Button>
            {totalCartItems > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                onClick={handleGoToCart}
              >
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
                <Badge className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 flex items-center justify-center text-xs bg-purple-600">
                  {totalCartItems}
                </Badge>
              </Button>
            )}
          </div>
        </div>

        {/* Multi-shop indicator bar */}
        {uniqueShops > 1 && (
          <div className="px-3 sm:px-4 pb-2">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Store size={14} className="text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-purple-800">Multi-Shop Order Active</p>
                  <p className="text-xs text-purple-600 truncate">
                    Items from {uniqueShops} shops • Total: ₹{totalCartValue}
                  </p>
                </div>
                <button
                  onClick={handleGoToCart}
                  className="text-purple-600 hover:text-purple-800 text-xs font-medium flex-shrink-0"
                >
                  View All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Multi-Shop Indicator */}
      {uniqueShops > 1 && !showMultiShopNotice && (
        <div className="md:hidden fixed top-32 sm:top-36 right-4 z-30">
          <button
            onClick={handleGoToCart}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full px-3 py-2 shadow-lg flex items-center gap-2 animate-pulse"
          >
            <Store size={14} />
            <span className="text-xs font-medium">{uniqueShops} shops</span>
            <Badge className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">{totalCartItems}</Badge>
          </button>
        </div>
      )}

      {/* Restaurant Image & Info */}
      <div className="relative">
        <img
          src={shop.image || "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"}
          alt={shop.name}
          className="w-full h-48 sm:h-56 md:h-64 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 md:block hidden">{shop.name}</h2>
              <p className="text-white/90 text-xs sm:text-sm md:block hidden truncate">{shop.description}</p>
              <div className="flex items-center gap-2 sm:gap-4 mt-1 sm:mt-2 text-xs sm:text-sm text-white/90">
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate text-xs sm:text-sm">{shop.location}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                  <span>4.8</span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <Badge className={`text-xs ${shopAcceptingOrders ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                {shopAcceptingOrders ? "Open" : "Closed"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-white shadow-sm sticky top-32 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-bold text-xl text-gray-900">{shop.name}</h1>
                  {uniqueShops > 1 && (
                    <Badge className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                      +{uniqueShops - 1} more shop{uniqueShops > 2 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">{shop.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/")}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Grid3X3 size={16} />
                Browse Other Shops
                {uniqueShops > 1 && (
                  <Badge className="bg-white/20 text-white text-xs px-2 py-1 rounded-full ml-1">
                    {uniqueShops - 1} active
                  </Badge>
                )}
              </Button>
              {totalCartItems > 0 && (
                <Button variant="outline" onClick={handleGoToCart} className="relative bg-transparent">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Cart ({totalCartItems})
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-purple-600 text-white">
                    {totalCartItems}
                  </Badge>
                </Button>
              )}
            </div>
          </div>

          {/* Multi-shop indicator bar for desktop */}
          {uniqueShops > 1 && (
            <div className="mt-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Store size={16} className="text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">Multi-Shop Order Active</p>
                    <p className="text-xs text-purple-600">
                      Items from {uniqueShops} shops • Current shop: {currentShopTotal} items (₹{currentShopValue}) •
                      Total: ₹{totalCartValue}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGoToCart}
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    View All Items
                  </button>
                  <Badge className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs">
                    {totalCartItems} total
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Floating Multi-Shop Indicator */}
      {uniqueShops > 1 && !showMultiShopNotice && (
        <div className="hidden md:block fixed top-40 right-6 z-30">
          <button
            onClick={handleGoToCart}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 hover:shadow-xl transition-all duration-200 animate-pulse"
          >
            <Store size={16} />
            <span className="text-sm font-medium">{uniqueShops} shops</span>
            <Badge className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{totalCartItems}</Badge>
          </button>
        </div>
      )}

      {/* Shop Status Messages */}
      <div className="px-4 pt-4">
        {!shopAcceptingOrders ? (
          <Card className="mb-4 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="text-red-600 mr-3 flex-shrink-0" size={24} />
                <div>
                  <p className="text-red-800 font-semibold mb-1">Shop is closed for orders</p>
                  <p className="text-red-700 text-sm">Orders are no longer being accepted for today.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          timeUntilClosure && (
            <Card className="mb-4 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertCircle className="text-orange-600 mr-3 flex-shrink-0" size={24} />
                  <div>
                    <p className="text-orange-800 font-semibold mb-1">
                      Shop closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                    </p>
                    <p className="text-orange-700 text-sm">Complete your order before the shop closes.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Content */}
      <div className="pt-4 md:pt-20">
        {/* Desktop Search + Categories */}
        <div className="hidden md:block mb-6 px-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={`Search in ${shop.name}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-100 border-0 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="price">Sort: Price</option>
              <option value="stock">Sort: Stock</option>
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category, index) => (
              <Button
                key={`${category || "unknown"}-${index}`}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`whitespace-nowrap rounded-full ${
                  selectedCategory === category
                    ? "bg-purple-600 text-white"
                    : "border-purple-200 text-purple-600 hover:bg-purple-50"
                }`}
              >
                {getCategoryLabel(category)}
              </Button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="px-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <Package size={64} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600">
                {searchQuery ? `No products match "${searchQuery}"` : "No products available in this category"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Layout */}
              <div className="md:hidden space-y-3 sm:space-y-4 pb-40">
                {sortedProducts.map((product) => {
                  const quantity = getProductQuantity(product.id)
                  return (
                    <Card key={product.id} className="border-0 shadow-sm mx-2 sm:mx-0">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-start gap-2">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-sm border-2 border-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-600" />
                                </div>
                              </div>
                              <button
                                onClick={() => toggleFavorite(product.id)}
                                className={`p-1 rounded-full transition-colors flex-shrink-0 ${
                                  favoriteProductIds.has(product.id) ? "text-red-500" : "text-gray-400"
                                }`}
                              >
                                <Heart size={14} fill={favoriteProductIds.has(product.id) ? "currentColor" : "none"} />
                              </button>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-gray-900 text-sm sm:text-base">₹{product.price}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{product.description}</p>
                          </div>

                          <div className="flex flex-col items-center gap-2 sm:gap-3 flex-shrink-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                              <img
                                src={product.image || "https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="w-16 sm:w-20 flex justify-center">
                              {quantity > 0 ? (
                                <div className="flex items-center gap-1 sm:gap-2 bg-purple-600 rounded-lg px-2 sm:px-3 py-1">
                                  <button onClick={() => handleRemoveFromLocalCart(product.id)} className="text-white">
                                    <Minus size={14} />
                                  </button>
                                  <span className="text-white font-semibold min-w-[16px] text-center text-sm">
                                    {quantity}
                                  </span>
                                  <button
                                    onClick={() => handleAddToLocalCart(product)}
                                    disabled={quantity >= product.stock}
                                    className="text-white disabled:opacity-50"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => handleAddToLocalCart(product)}
                                  disabled={product.stock === 0 || !shopAcceptingOrders}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg font-semibold text-xs sm:text-sm h-7 sm:h-8 transform-none active:transform-none hover:transform-none focus:transform-none"
                                >
                                  ADD
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedProducts.map((product) => {
                  const quantity = getProductQuantity(product.id)
                  return (
                    <Card
                      key={product.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow h-80 flex flex-col"
                    >
                      <div className="relative aspect-square h-32 flex-shrink-0">
                        <img
                          src={product.image || "https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => toggleFavorite(product.id)}
                          className={`absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow ${
                            favoriteProductIds.has(product.id) ? "text-red-500" : "text-gray-500"
                          }`}
                        >
                          <Heart size={14} fill={favoriteProductIds.has(product.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <CardContent className="p-3 flex-1 flex flex-col">
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm line-clamp-2">{product.name}</h3>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2 flex-1">{product.description}</p>

                        <div className="mt-auto">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-purple-600">₹{product.price}</span>
                            <Badge variant="outline" className="text-xs">
                              {product.stock} left
                            </Badge>
                          </div>

                          {quantity > 0 ? (
                            <div className="flex items-center justify-center gap-2 bg-purple-600 rounded-lg px-3 py-1.5">
                              <button onClick={() => handleRemoveFromLocalCart(product.id)} className="text-white">
                                <Minus size={14} />
                              </button>
                              <span className="text-white font-semibold text-sm">{quantity}</span>
                              <button
                                onClick={() => handleAddToLocalCart(product)}
                                disabled={quantity >= product.stock}
                                className="text-white disabled:opacity-50"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleAddToLocalCart(product)}
                              disabled={product.stock === 0 || !shopAcceptingOrders}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-1.5 text-sm"
                              size="sm"
                            >
                              {product.stock === 0 ? "Out of Stock" : "ADD"}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop Cart Summary - Enhanced for Multi-Shop */}
      {totalCartItems > 0 && (
        <div className="hidden md:block fixed bottom-6 right-6 z-40">
          <Card className="bg-purple-600 text-white border-0 shadow-lg min-w-[300px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold">
                    {totalCartItems} item{totalCartItems !== 1 ? "s" : ""} • ₹{totalCartValue}
                  </p>
                  <p className="text-xs text-purple-100">
                    {uniqueShops > 1
                      ? `From ${uniqueShops} shops • Current: ${currentShopTotal} items (₹${currentShopValue})`
                      : "Items in your bag"}
                  </p>
                </div>
                <button
                  onClick={handleGoToCart}
                  className="bg-purple-700 hover:bg-purple-800 px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  View bag
                </button>
              </div>

              {uniqueShops > 1 && (
                <div className="border-t border-purple-500 pt-2 mt-2">
                  <div className="flex items-center justify-between text-xs text-purple-200">
                    <span>Other shops: {otherShopsItems.length} items</span>
                    <span>₹{totalCartValue - currentShopValue}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fixed Search Bar - Always Visible on Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input
              ref={mobileSearchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${shop.name}`}
              className="pl-8 sm:pl-10 pr-8 sm:pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
            <Button
              aria-label="Open filters"
              onClick={() => setShowMobileMenu(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full h-10 w-10 p-0 shadow flex items-center justify-center focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
            >
              <Filter size={16} />
            </Button>
            <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl overflow-y-auto">
              {/* Drag handle */}
              <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-gray-300" />
              <SheetHeader className="sticky top-0 bg-white pb-4 border-b border-gray-100 z-10">
                <div className="flex items-center justify-between px-0">
                  <div>
                    <SheetTitle className="text-lg font-bold text-gray-900">Filter & Sort</SheetTitle>
                    <SheetDescription className="text-sm text-gray-500">
                      Refine your search in {shop.name}
                    </SheetDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMobileMenu(false)}
                    aria-label="Close"
                    className="rounded-full h-8 w-8 p-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </SheetHeader>

               <div className="flex flex-col h-full px-0">
                {/* Categories Section - Scrollable */}
                <div className="flex-1 py-4">
                  <h3 className="font-semibold text-base text-gray-900 mb-4 flex items-center gap-2 px-1">
                    <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                    Categories
                  </h3>
                  <div className="overflow-y-auto max-h-[220px] pr-1">
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((category, index) => (
                        <button
                          key={`${category || "unknown"}-${index}`}
                          onClick={() => {
                            setSelectedCategory(category)
                          }}
                           className={`flex items-center justify-center p-3 rounded-xl border-2 transition-colors duration-200 ${
                            selectedCategory === category
                               ? "border-purple-600 bg-purple-50 text-purple-900"
                               : "border-gray-200 bg-white text-gray-700 hover:border-purple-300"
                          }`}
                        >
                           <span className="font-medium text-sm text-center leading-tight">
                            {getCategoryLabel(category)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Sort Section - Fixed */}
                <div className="pb-4">
                  <h3 className="font-semibold text-base text-gray-900 mb-4 flex items-center gap-2 px-1">
                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                    Sort By
                  </h3>
                   <div className="space-y-2">
                    {[
                      { value: "relevance", label: "Relevance" },
                      { value: "price", label: "Price: Low to High" },
                      { value: "stock", label: "Stock: High to Low" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as any)
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors duration-200 ${
                          sortBy === option.value
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                        }`}
                      >
                        <span className="font-medium text-sm">{option.label}</span>
                        {sortBy === option.value && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Bar - Fixed */}
                 <div className="sticky bottom-0 border-t border-gray-100 pt-3 pb-2 bg-white">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCategory("all")
                        setSortBy("relevance")
                      }}
                       className="flex-1 bg-transparent border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl py-3 font-medium"
                    >
                      Reset Filters
                    </Button>
                    <Button
                      onClick={() => setShowMobileMenu(false)}
                       className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-medium"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Cart Popup - Above Search Bar (match design) */}
      {totalCartItems > 0 && (
        <div className="md:hidden fixed bottom-16 left-2 right-2 z-40">
          <button
            onClick={handleGoToCart}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag size={16} className="flex-shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-semibold text-sm">{currentShopTotal} from {shop.name}</span>
                  <span className="text-[11px] text-purple-100">₹{currentShopValue} • Tap to review order</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">₹{currentShopValue}</span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

export default ShopPage