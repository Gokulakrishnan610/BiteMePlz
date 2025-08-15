"use client"

import type React from "react"
import { useEffect, useMemo, useState, useDeferredValue, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import {
  Package,
  AlertCircle,
  ArrowLeft,
  MapPin,
  Search,
  X,
  Star,
  Plus,
  Minus,
  Filter,
  Heart,
  ShoppingBag,
  Store,
  Grid3X3,
  
} from "lucide-react"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import Navbar from "../components/Navbar"
import api from "../api"
import { useCart } from "../context/CartContext"
import { useAuth } from "../context/AuthContext"
import { toast } from 'sonner'
// no-op alias imports removed

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
  disabled_categories?: string[]
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
  const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart()

  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  // const [allShops, setAllShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [localCart, setLocalCart] = useState<LocalCartItem[]>([])
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [sortBy, setSortBy] = useState<"relevance" | "price" | "stock">("relevance")
  const mobileSearchRef = useRef<HTMLInputElement>(null)
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set())
  // Live stock updates via WebSocket
  useEffect(() => {
    if (!id) return
    let ws: WebSocket | null = null
    try {
      const loc = window.location
      const wsProto = loc.protocol === 'https:' ? 'wss' : 'ws'
      // Connect to backend WebSocket server
      const wsUrl = import.meta.env.PROD 
        ? 'wss://kioskrec.onrender.com/ws/stock/'
        : `${wsProto}://${loc.hostname}:8000/ws/stock/`
      ws = new WebSocket(wsUrl)
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data && data.type === 'stock_update') {
            const { product_id, stock, shop_id } = data
            if (shop_id && product_id && shop_id === id) {
              setProducts((prev) => prev.map((p) => (p.id === product_id ? { ...p, stock: Number(stock) } : p)))
            }
          }
        } catch {}
      }
    } catch {}
    return () => {
      try { ws && ws.close() } catch {}
    }
  }, [id])
  const favoritesStorageKey = useMemo(() => (user ? `favorites_${user._id}` : 'favorites_guest'), [user])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(favoritesStorageKey)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          setFavoriteProductIds(new Set(arr))
        }
      }
    } catch (e) {
      console.error('Failed to load favorites:', e)
    }
  }, [favoritesStorageKey])
  const [showMultiShopNotice, setShowMultiShopNotice] = useState(false)
  const [multiShopNoticeShown, setMultiShopNoticeShown] = useState(false)
  

  
  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem("multiShopCart")
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        setLocalCart(parsedCart)
      } catch (error) {
        console.error("Error loading cart from localStorage:", error)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("multiShopCart", JSON.stringify(localCart))
  }, [localCart])

  // Check for multi-shop orders and show notice only when appropriate
  useEffect(() => {
    if (!id || localCart.length === 0) {
      setShowMultiShopNotice(false)
      setMultiShopNoticeShown(false)
      return
    }

    const hasItemsFromOtherShops = localCart.some((item: LocalCartItem) => item.shopId !== id)
    
    // Only show notice if we haven't shown it yet for this session and there are items from other shops
    if (hasItemsFromOtherShops && !multiShopNoticeShown) {
      setShowMultiShopNotice(true)
      setMultiShopNoticeShown(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowMultiShopNotice(false), 5000)
      return () => clearTimeout(timer)
    } else if (!hasItemsFromOtherShops) {
      setShowMultiShopNotice(false)
      // Reset the shown flag when there are no more items from other shops
      setMultiShopNoticeShown(false)
    }
  }, [localCart, id, multiShopNoticeShown])

  // Reset multi-shop notice state when shop ID changes
  useEffect(() => {
    setShowMultiShopNotice(false)
    setMultiShopNoticeShown(false)
  }, [id])

  // Sync local cart with global cart when global cart changes
  useEffect(() => {
    if (!id || cartItems.length === 0) return

    // Get items from global cart for current shop
    const currentShopGlobalItems = cartItems.filter((item) => {
      const shopId = typeof item.shop_id === 'string' ? item.shop_id : item.shop_id.id
      return shopId === id
    })

    // Only update if there are actual changes to prevent infinite loops
    setLocalCart((prev) => {
      const otherShopItems = prev.filter((item) => item.shopId !== id)
      const currentShopItems = currentShopGlobalItems.map((item) => ({
        productId: typeof item.product_id === 'string' ? item.product_id : item.product_id.id,
        quantity: item.quantity,
        product: {
          id: typeof item.product_id === 'string' ? item.product_id : item.product_id.id,
          name: item.name,
          description: '', // We don't have description in global cart
          category: '', // We don't have category in global cart
          price: item.price,
          stock: item.stock,
          image: item.image,
          is_available: true
        },
        shopId: id,
        shopName: item.shop_name
      }))

      const newCart = [...otherShopItems, ...currentShopItems]
      
      // Only update if there are actual changes
      if (JSON.stringify(prev) !== JSON.stringify(newCart)) {
        return newCart
      }
      return prev
    })
  }, [cartItems, id])

  const toggleFavorite = (productId: string) => {
    setFavoriteProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      try {
        localStorage.setItem(favoritesStorageKey, JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()

    const fetchShopAndProducts = async () => {
      try {
        const [shopResponse, productsResponse] = await Promise.all([
          api.get(`/api/shops/${id}/`),
          api.get(`/api/products/`, {
            params: { shop: id },
          }),
        ])

        setShop(shopResponse.data)
        const allProducts = productsResponse.data.results || []
        setProducts(allProducts.filter((product: Product) => product.is_available))
        // setAllShops(allShopsResponse.data.results || [])
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
    // Check local cart first
    const localItem = localCart.find((item) => item.productId === productId && item.shopId === id)
    if (localItem) {
      return localItem.quantity
    }
    
    // If not in local cart, check global cart context
    const globalItem = cartItems.find((item) => 
      (typeof item.product_id === 'string' ? item.product_id : item.product_id.id) === productId && 
      (typeof item.shop_id === 'string' ? item.shop_id : item.shop_id.id) === id
    )
    
    return globalItem ? globalItem.quantity : 0
  }

  // Get current shop's cart items and calculations
  const currentShopCartItems = useMemo(() => {
    return localCart.filter((item) => item.shopId === id)
  }, [localCart, id])

  const currentShopCartValue = useMemo(() => {
    return currentShopCartItems.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }, [currentShopCartItems])

  const currentShopCartCount = useMemo(() => {
    return currentShopCartItems.reduce((total, item) => total + item.quantity, 0)
  }, [currentShopCartItems])

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

    // Add to local cart for multi-shop functionality
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

    // Also add to the main cart context for backend integration
    if (!product.id || !shop?.id) {
      toast.error("Product or shop information is incomplete. Please try again.")
      return
    }
    
    // Check if item already exists in global cart
    const existingGlobalItem = cartItems.find((item) => 
      (typeof item.product_id === 'string' ? item.product_id : item.product_id.id) === product.id && 
      (typeof item.shop_id === 'string' ? item.shop_id : item.shop_id.id) === shop.id
    )
    
    if (existingGlobalItem) {
      // Update quantity in global cart
      const newQuantity = Math.min(existingGlobalItem.quantity + 1, product.stock)
      updateQuantity(product.id, shop.id, newQuantity)
    } else {
      // Add new item to global cart
      addToCart({
        id: product.id + "-" + Date.now(),
        product_id: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: 1,
        stock: product.stock,
        shop_id: shop.id,
        shop_name: shop.name,
      })
    }
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

    // Also update the global cart context to keep them in sync
    if (id) {
      const globalItem = cartItems.find((item) => 
        (typeof item.product_id === 'string' ? item.product_id : item.product_id.id) === productId && 
        (typeof item.shop_id === 'string' ? item.shop_id : item.shop_id.id) === id
      )
      
      if (globalItem) {
        const newQuantity = globalItem.quantity > 1 ? globalItem.quantity - 1 : 0
        if (newQuantity > 0) {
          // Update quantity in global cart
          updateQuantity(productId, id, newQuantity)
        } else {
          // Remove from global cart
          removeFromCart(productId, id)
        }
      }
    }
  }

  const handleGoToCart = () => {
    navigate("/cart")
  }

  // const handleShopNavigation = (shopId: string) => {
  //   navigate(`/shop/${shopId}`)
  // }

  const disabledCategories = useMemo(() => (shop?.disabled_categories as unknown as string[]) || [], [shop])

  const validCategories = useMemo(
    () =>
      products
        .filter((product) => product.is_available && product.stock > 0)
        .map((product) => product.category)
        .filter((category) => category && typeof category === "string")
        .filter((category) => !disabledCategories.includes(category as string)),
    [products, disabledCategories],
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
        // Hide products from disabled categories
        if (disabledCategories.includes(product.category)) return false;
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
    [products, selectedCategory, deferredSearch, favoriteProductIds, disabledCategories],
  )

  const sortedProducts = useMemo(() => {
    if (sortBy === "price") return [...filteredProducts].sort((a, b) => a.price - b.price)
    if (sortBy === "stock") return [...filteredProducts].sort((a, b) => b.stock - a.stock)
    return filteredProducts
  }, [filteredProducts, sortBy])

  const clearSearch = () => {
    setSearchQuery("")
  }



  // Combine local cart and global cart for complete cart data
  const combinedCartItems = useMemo(() => {
    const localItems = [...localCart]
    
    // Add global cart items that aren't already in local cart
    cartItems.forEach((globalItem) => {
      const globalProductId = typeof globalItem.product_id === 'string' ? globalItem.product_id : globalItem.product_id.id
      const globalShopId = typeof globalItem.shop_id === 'string' ? globalItem.shop_id : globalItem.shop_id.id
      
      const existingLocalItem = localItems.find((localItem) => 
        localItem.productId === globalProductId && localItem.shopId === globalShopId
      )
      
      if (!existingLocalItem) {
        // Add global item to local cart if it doesn't exist
        localItems.push({
          productId: globalProductId,
          quantity: globalItem.quantity,
          product: {
            id: globalProductId,
            name: globalItem.name,
            description: '', // We don't have description in global cart
            category: '', // We don't have category in global cart
            price: globalItem.price,
            stock: globalItem.stock,
            image: globalItem.image,
            is_available: true
          },
          shopId: globalShopId,
          shopName: globalItem.shop_name
        })
      }
    })
    
    return localItems
  }, [localCart, cartItems])

  const totalCartItems = combinedCartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalCartValue = combinedCartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  // Memoized list of current shop items (not directly used, but kept for clarity if needed later)
  // const currentShopItems = useMemo(() => combinedCartItems.filter((item) => item.shopId === id), [combinedCartItems, id])
  // const currentShopTotal = currentShopItems.reduce((sum, item) => sum + item.quantity, 0)
  // const currentShopValue = currentShopItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const otherShopsItems = combinedCartItems.filter((item) => item.shopId !== id)
  const uniqueShops = new Set(combinedCartItems.map((item) => item.shopName)).size
  // const shopsWithItems = new Set(combinedCartItems.map((item) => item.shopId))

  // Filter other shops (exclude current shop and closed shops)
  // const otherShops = allShops.filter((s) => s.id !== id && s.is_open)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shop...</p>
        </div>
      </div>
    )
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar />

             {/* Multi-Shop Notice */}
       {showMultiShopNotice && uniqueShops > 1 && (
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
                    onClick={() => {
                      setShowMultiShopNotice(false)
                      setMultiShopNoticeShown(true) // Mark as shown so it won't reappear
                    }}
                    className="text-white/80 hover:text-white flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
               </div>
             </CardContent>
           </Card>
         </div>
       )}



               {/* Mobile Header */}
       <div className="md:hidden bg-white shadow-sm sticky top-3 z-10 pt-20 sm:pt-24">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
              onClick={() => navigate("/")}
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
         {uniqueShops > 1 && otherShopsItems.length > 0 && (
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
        {uniqueShops > 1 && otherShopsItems.length > 0 && !showMultiShopNotice && (
          <div className="md:hidden fixed top-36 sm:top-40 right-4 z-30">
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
          src={shop.image || "/placeholder.svg"}
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

      {/* Desktop Task Bar */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <div className="w-full py-3">
          <div className="flex items-center justify-between px-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Back</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="font-medium">Browse Other Shops</span>
            </Button>
          </div>
        </div>
      </div>





             {/* Desktop Floating Multi-Shop Indicator */}
       {uniqueShops > 1 && otherShopsItems.length > 0 && !showMultiShopNotice && (
         <div className="hidden md:block fixed top-40 right-6 z-30">
           <button
             onClick={handleGoToCart}
             className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 hover:shadow-xl transition-all duration-200 animate-pulse"
           >
             <Store size={16} />
             <span className="text-sm font-medium">{uniqueShops} shops</span>
             <Badge className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{currentShopCartCount}</Badge>
           </button>
         </div>
       )}

      {/* Content */}
      <div className="pt-4 md:pt-4">
                 {/* Desktop Search + Categories */}
         <div className="hidden md:block mb-6 px-6">
           <div className="flex gap-3 mb-4">
                {categories.map((category, index) => (
                  <Button
                 key={`${category || "unknown"}-${index}`}
                    onClick={() => setSelectedCategory(category)}
                    variant={selectedCategory === category ? "default" : "outline"}
                 className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm ${
                      selectedCategory === category
                     ? "bg-purple-600 text-white"
                     : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                 }`}
                  >
                    {getCategoryLabel(category)}
                  </Button>
                ))}
              </div>
            </div>

        {/* Products */}
        <div className="px-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package size={80} className="text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Products Found</h3>
              <p className="text-gray-600 text-lg">
                {searchQuery ? `No products match "${searchQuery}"` : "No products available in this category"}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Layout */}
              <div className="md:hidden space-y-3 sm:space-y-4 pb-32">
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
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>

                                                         <div className="w-12 sm:w-20 flex justify-center">
                               {quantity > 0 ? (
                                 <div className="flex items-center gap-0.5 sm:gap-2 bg-purple-600 rounded-lg px-0.5 sm:px-1 py-1 h-6 sm:h-8">
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
                                   className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg font-semibold text-xs sm:text-sm h-7 sm:h-8 transform-none active:transform-none hover:transform-none"
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
                       className="overflow-hidden hover:shadow-lg transition-shadow h-80 flex flex-col border border-gray-200"
                >
                       <div className="relative aspect-square h-32 flex-shrink-0">
                    <img
                           src={product.image || "/placeholder.svg"}
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
                         <div className="absolute top-2 left-2">
                           <div className="w-4 h-4 rounded-full border border-green-600 bg-white flex items-center justify-center">
                             <div className="w-2 h-2 rounded-full bg-green-600" />
                           </div>
                         </div>
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

             {/* Mobile Cart Summary - Positioned above search bar */}
       {currentShopCartCount > 0 && (
         <div className="md:hidden fixed bottom-16 left-4 right-4 z-40">
           <Card className="bg-purple-600 text-white border-0 shadow-lg">
             <CardContent className="p-3">
               <div className="flex items-center justify-between">
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-sm">
                     {currentShopCartCount} item{currentShopCartCount !== 1 ? "s" : ""} • ₹{currentShopCartValue}
                   </p>
                   <p className="text-xs text-purple-100 truncate">
                      {uniqueShops > 1
                        ? `From ${uniqueShops} shops • Current: ${currentShopCartCount} items (₹${currentShopCartValue})`
                        : "Items in your bag"}
                   </p>
                 </div>
                 <button
                   onClick={handleGoToCart}
                   className="bg-purple-700 hover:bg-purple-800 px-3 py-2 rounded-lg font-semibold transition-colors text-sm ml-2 flex-shrink-0"
                 >
                   View bag
                 </button>
                    </div>

               {uniqueShops > 1 && (
                 <div className="border-t border-purple-500 pt-2 mt-2">
                   <div className="flex items-center justify-between text-xs text-purple-200">
                     <span>Other shops: {otherShopsItems.length} items</span>
                     <span>₹{totalCartValue - currentShopCartValue}</span>
                   </div>
                 </div>
               )}
                  </CardContent>
                </Card>
         </div>
       )}


       {/* Desktop Cart Floating Button */}
       {currentShopCartCount > 0 && (
         <div className="hidden md:block fixed bottom-8 right-8 z-40">
           <button
             onClick={handleGoToCart}
             className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2"
           >
             <ShoppingBag size={18} />
             <span className="font-semibold">View bag</span>
             <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">{currentShopCartCount}</span>
             <span className="ml-2 text-sm text-purple-100">₹{currentShopCartValue}</span>
           </button>
         </div>
       )}



                    {/* Mobile Search Bar - Always Visible */}
       <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
                            {currentShopCartCount === 0 && (
           <div className="px-3 sm:px-4 py-2 border-b border-gray-100">
             <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
               <ShoppingBag size={16} />
               <span>Your cart is empty • Add items to get started</span>
             </div>
           </div>
         )}

         <div className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-3">
           <div className="flex-1 relative">
             <Search
               className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
               size={16}
             />
             <Input
               ref={mobileSearchRef}
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               placeholder={`Search in ${shop?.name || 'Shop'}`}
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
                    <Button
             onClick={() => setShowMobileMenu(true)}
             className="bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-6 py-2 rounded-xl font-semibold flex-shrink-0"
           >
             <Filter size={14} />
           </Button>
         </div>
       </div>

       {/* Mobile Filter Modal */}
       {showMobileMenu && (
         <div className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-end">
           <div className="bg-white w-full rounded-t-3xl p-6 pb-8 max-h-[80vh] overflow-y-auto">
             {/* Header */}
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-gray-900">Filters & Sort</h3>
               <button
                 onClick={() => setShowMobileMenu(false)}
                 className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
               >
                 <X size={20} className="text-gray-600" />
               </button>
             </div>

                          {/* Sort Options */}
             <div className="mb-4 flex items-center gap-3">
               <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</span>
               <div className="flex gap-1 flex-1">
                 {[
                   { value: "relevance", label: "Relevance" },
                   { value: "price", label: "Price" },
                   { value: "stock", label: "Stock" }
                 ].map((option) => (
                   <button
                     key={option.value}
                     onClick={() => {
                       setSortBy(option.value as any)
                       setShowMobileMenu(false)
                     }}
                     className={`flex-1 py-2 px-2 rounded-md border transition-all text-xs font-medium ${
                       sortBy === option.value
                         ? "border-purple-600 bg-purple-600 text-white shadow-sm"
                         : "border-gray-300 bg-white text-gray-600 hover:border-purple-400 hover:bg-purple-50"
                     }`}
                   >
                     {option.label}
                   </button>
                 ))}
               </div>
             </div>

             {/* Categories */}
             <div className="mb-6">
               <h4 className="text-lg font-semibold text-gray-900 mb-3">Categories</h4>
               <div className="grid grid-cols-2 gap-3">
                 {categories.map((category, index) => (
                   <button
                     key={`${category || "unknown"}-${index}`}
                     onClick={() => {
                       setSelectedCategory(category)
                       setShowMobileMenu(false)
                     }}
                     className={`p-3 rounded-xl border-2 transition-all text-center ${
                       selectedCategory === category
                         ? "border-purple-600 bg-purple-600 text-white"
                         : "border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:bg-purple-50"
                     }`}
                   >
                     <span className="font-medium text-sm">{getCategoryLabel(category)}</span>
                   </button>
                 ))}
               </div>
             </div>



             {/* Search Query Display */}
             {searchQuery && (
               <div className="mb-6">
                 <h4 className="text-lg font-semibold text-gray-900 mb-3">Current Search</h4>
                 <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                   <Search size={16} className="text-purple-600" />
                   <span className="text-purple-700 font-medium">"{searchQuery}"</span>
                   <button
                     onClick={() => {
                       clearSearch()
                       setShowMobileMenu(false)
                     }}
                     className="ml-auto p-1 rounded-full bg-purple-200 hover:bg-purple-300 transition-colors"
                   >
                     <X size={14} className="text-purple-700" />
                   </button>
                 </div>
               </div>
             )}



             {/* Results Count */}
             <div className="text-center text-gray-600 text-sm">
               {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }

 export default ShopPage