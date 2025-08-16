"use client"

import type React from "react"
import { useEffect, useMemo, useState, useDeferredValue } from "react"
import { Link } from "react-router-dom"
import api from "../api"
import { Search, MapPin, Clock, Star, Coffee, Utensils, Cookie, BookOpen, Smartphone, Package, Heart } from 'lucide-react'
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import Navbar from "../components/Navbar"
// import SimpleLoading from "../components/SimpleLoading"
import { getMediaUrl } from "../lib/utils";

interface Shop {
  id: string
  name: string
  description: string
  location: string
  image: string
  is_open: boolean
  final_validity_time: string
  category?: string
  rating?: number
  delivery_time?: string
  delivery_fee?: number
  disabled_categories?: string[]
}

interface Product {
  _id: string
  name: string
  category: string
  is_available: boolean
  stock: number
  shop: {
    id: string
    name: string
  }
}

const categoryIconMap: { [key: string]: any } = {
  All: Package,
  food: Utensils,
  beverages: Coffee,
  snacks: Cookie,
  stationery: BookOpen,
  electronics: Smartphone,
  others: Package,
}

const HomePage: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>(["All"])
  // Derived list that respects shops' disabled_categories
  const filteredAvailableCategories = useMemo(() => {
    if (!availableCategories || availableCategories.length === 0) return ["All"]
    const allowed = new Set<string>()
    // Keep "All" always
    if (availableCategories.includes("All")) allowed.add("All")
    // Include a category if at least one shop has NOT disabled it
    availableCategories.forEach((cat) => {
      if (cat === "All") return
      const anyShopAllows = shops.some((s) => !(s.disabled_categories || []).includes(cat.toLowerCase()))
      if (anyShopAllows) allowed.add(cat)
    })
    return Array.from(allowed)
  }, [availableCategories, shops])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isFiltering, setIsFiltering] = useState(false)
  const [componentsLoaded, setComponentsLoaded] = useState(0)
  const [recentShops, setRecentShops] = useState<Shop[]>([])

  // Get recent shops from localStorage or random shops
  const getRecentShops = (allShops: Shop[]) => {
    try {
      const recentShopIds = JSON.parse(localStorage.getItem("recentShops") || "[]")
      if (recentShopIds.length > 0) {
        const recent = recentShopIds
          .map((id: string) => allShops.find((shop) => shop.id === id))
          .filter(Boolean)
          .slice(0, 2)
        return recent
      }
         } catch (error) {
       // Silent fail for recent shops
     }

    // Return random shops if no recent shops
    const shuffled = [...allShops].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 2)
  }

  // Save shop to recent when user visits it
  const addToRecentShops = (shopId: string) => {
    try {
      const recentShopIds = JSON.parse(localStorage.getItem("recentShops") || "[]")
      const updatedRecent = [shopId, ...recentShopIds.filter((id: string) => id !== shopId)].slice(0, 5)
      localStorage.setItem("recentShops", JSON.stringify(updatedRecent))
         } catch (error) {
       // Silent fail for saving recent shop
     }
  }

  // Fetch available categories from products
  const fetchAvailableCategories = async (signal?: AbortSignal) => {
    try {
      const { data } = await api.get("/api/products/", { signal, params: { stock__gt: 0, is_available: true } })
      const products = data.results || data
      if (Array.isArray(products)) {
        const categories = new Set<string>()
        products.forEach((product: Product) => {
          if (product.is_available && product.stock > 0 && product.category) {
            categories.add(product.category.toLowerCase())
          }
        })
        const sortedCategories = Array.from(categories).sort()
        const categoryArray = ["All", ...sortedCategories]
        setAvailableCategories(categoryArray)
      }
         } catch (error) {
       setAvailableCategories(["All", "beverages", "electronics", "food", "others", "snacks", "stationery"])
     }
  }

  const fetchShops = async (signal?: AbortSignal) => {
    try {
      const { data } = await api.get("/api/shops/", { signal })
      
      const shopsData = data.results || data
      const shopsArray = Array.isArray(shopsData) ? shopsData : []
      
      setShops(shopsArray)
      setFilteredShops(shopsArray)

      // Set recent shops
      const recent = getRecentShops(shopsArray)
      setRecentShops(recent)
      
      return shopsArray
         } catch (err) {
       throw err
     }
  }

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        await Promise.all([fetchShops(controller.signal), fetchAvailableCategories(controller.signal)])
        setLoading(false)
      } catch (err) {
        if ((err as any)?.name !== "CanceledError" && (err as any)?.code !== "ERR_CANCELED") {
          setError("Failed to load data")
          setLoading(false)
        }
      }
    }
    load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const filterShops = async () => {
      setIsFiltering(true)
      let filtered = shops

      // If searching for a product by name
      if (searchQuery) {
        try {
          const { data } = await api.get("/api/products/", {
            params: {
              name: searchQuery, // Assuming backend supports filtering by name
              is_available: true,
              stock__gt: 0,
            },
          })
          const products = data.results || data
          // Extract unique shop IDs from products
          const shopIdsWithProduct = new Set(
            products.map((product: Product) => (product.shop && (product.shop as any).id) || product.shop)
          )
          // Filter shops that have the product
          filtered = shops.filter((shop) => shopIdsWithProduct.has(shop.id))
        } catch (error) {
          // fallback: no shops if error
          filtered = []
        }
      } else if (selectedCategory !== "All") {
        try {
          const { data } = await api.get("/api/products/", {
            params: {
              category: selectedCategory.toLowerCase(),
              is_available: true,
              stock__gt: 0,
            },
          })
          const products = data.results || data
          const shopIdsWithCategory = new Set(
            products.map((product: Product) => (product.shop && (product.shop as any).id) || product.shop)
          )
          // Exclude shops that have disabled this category
          filtered = shops
            .filter((shop) => shopIdsWithCategory.has(shop.id))
            .filter((shop) => !((shop.disabled_categories || []).includes(selectedCategory.toLowerCase())))
        } catch (error) {
          filtered = shops.filter((shop) => {
            return shop.category === selectedCategory || shop.category === selectedCategory.toLowerCase()
          })
        }
      }

      // If not searching for a product, still allow filtering by shop name/description
      if (!searchQuery && (selectedCategory === "All")) {
        filtered = shops
      }

      setFilteredShops(filtered)
      setIsFiltering(false)
    }
    filterShops()
  }, [shops, selectedCategory, searchQuery])

  const deferredSearch = useDeferredValue(searchQuery)
  const displayedShops = useMemo(() => {
    // If searching for products, show all shops that have the product (no additional filtering)
    if (searchQuery) return filteredShops
    
    // If not searching for products, apply shop name/description filtering
    if (!deferredSearch) return filteredShops
    const q = deferredSearch.toLowerCase()
    return filteredShops.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
  }, [filteredShops, deferredSearch, searchQuery])

  useEffect(() => {
    if (loading) return
    const steps = [
      () => setComponentsLoaded(1),
      () => setComponentsLoaded(2),
      () => setComponentsLoaded(3),
      () => setComponentsLoaded(4),
      () => setComponentsLoaded(5),
    ]
    steps.forEach((fn, i) => setTimeout(fn, (i + 1) * 120))
  }, [loading])

  const getTimeUntilClosure = (final_validity_time: string) => {
    if (!final_validity_time) return null
    const now = new Date()
    const final_validity = new Date(final_validity_time)
    const timeDiff = final_validity.getTime() - now.getTime()
    if (timeDiff <= 0) return null
    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    return { hours, minutes }
  }

  const isShopOpen = (shop: Shop) => {
    if (!shop.is_open) return false
    if (shop.final_validity_time) {
      const now = new Date()
      const final_validity = new Date(shop.final_validity_time)
      if (now > final_validity) return false
    }
    return true
  }

  const getCategoryIcon = (category: string) => {
    return categoryIconMap[category] || categoryIconMap[category.toLowerCase()] || Package
  }

  const getCategoryLabel = (category: string) => {
    if (category === "All") return "All"
    const labels: { [key: string]: string } = {
      food: "Food",
      beverages: "Beverages",
      snacks: "Snacks",
      stationery: "Stationery",
      electronics: "Electronics",
      others: "Others",
    }
    return labels[category.toLowerCase()] || category.charAt(0).toUpperCase() + category.slice(1)
  }

  const handleShopClick = (shopId: string) => {
    addToRecentShops(shopId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shops...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <p className="text-red-600 mb-4 text-lg">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-purple-600 hover:bg-purple-700">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar />

      {/* Desktop Layout */}
      <div className="hidden md:block">
        {/* Header with fade-in animation */}
        <div
          className={`pt-32 md:pt-40 bg-white border-b border-gray-200 transition-opacity duration-500 ${
            componentsLoaded >= 1 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search shops and items"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Categories with fade-in animation */}
        <div
          className={`max-w-7xl mx-auto px-4 py-4 transition-opacity duration-500 ${
            componentsLoaded >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filteredAvailableCategories.map((category) => {
              const IconComponent = getCategoryIcon(category)
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                    selectedCategory === category
                      ? "bg-[#6a1b9a] text-white hover:bg-[#5a1688]"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <IconComponent size={16} />
                  {getCategoryLabel(category)}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Shops Grid with staggered animation */}
        <div
          className={`max-w-7xl mx-auto px-4 pb-8 transition-opacity duration-500 ${
            componentsLoaded >= 3 ? "opacity-100" : "opacity-0"
          }`}
        >
          {isFiltering ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Finding shops with {getCategoryLabel(selectedCategory)}...</p>
            </div>
          ) : displayedShops.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <Search size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shops found</h3>
              <p className="text-gray-600">
                {selectedCategory !== "All"
                  ? `No shops have products in the "${getCategoryLabel(selectedCategory)}" category with stock available.`
                  : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div>
              {/* Category Summary */}
              {selectedCategory !== "All" && (
                <div className="mb-6 text-center">
                  <p className="text-gray-600">
                    Showing shops with {getCategoryLabel(selectedCategory)} products in stock
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                {displayedShops.map((shop) => {
                  const timeUntilClosure = getTimeUntilClosure(shop.final_validity_time)
                  const isOpen = isShopOpen(shop)
                  const cardDelay = 0

                  if (!shop.id) {
                    return null
                  }

                  return (
                    <Link
                      key={shop.id}
                      to={isOpen ? `/shop/${shop.id}` : "#"}
                      onClick={() => isOpen && handleShopClick(shop.id)}
                      className={`group transition-opacity duration-500 h-full ${
                        isOpen ? "" : "pointer-events-none opacity-60"
                      } ${componentsLoaded >= 4 ? "opacity-100" : "opacity-0"}`}
                      style={{ transitionDelay: `${cardDelay}ms` }}
                    >
                      <Card className="overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200 bg-white font-sans h-full flex flex-col">
                        <div className="relative aspect-[4/3] overflow-hidden flex-shrink-0">
                          <img
                            src={
                              shop.image
                                ? getMediaUrl(shop.image)
                                : "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"
                            }
                            alt={shop.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <CardContent className="p-3 flex-1 flex flex-col">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-purple-600 transition-colors line-clamp-2 min-h-[2.5rem]">
                              {shop.name}
                            </h3>
                            <Badge
                              variant={isOpen ? "default" : "secondary"}
                              className={`text-xs ${
                                isOpen
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "bg-gray-500 hover:bg-gray-600 text-white"
                              }`}
                            >
                              {isOpen ? "Open" : "Closed"}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2 min-h-[2rem]">{shop.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                            <div className="flex items-center">
                              <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                              <span className="font-medium">{shop.rating || 4.8}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>{shop.delivery_time || "15-25 min"}</span>
                            </div>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mb-1">
                            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{shop.location}</span>
                          </div>
                          {isOpen && timeUntilClosure && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">
                                Closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Content */}
        <div className="pt-20">
          {/* Search Bar */}
          <div className="px-4 py-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search shops and items"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
              />
            </div>
          </div>

          {/* Mobile Category Filters */}
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filteredAvailableCategories.map((category) => {
                const IconComponent = getCategoryIcon(category)
                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategory === category
                        ? "bg-[#6a1b9a] text-white hover:bg-[#5a1688]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent size={16} />
                    {getCategoryLabel(category)}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="px-4 py-4">
            {isFiltering ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Finding shops with {getCategoryLabel(selectedCategory)}...</p>
              </div>
            ) : displayedShops.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No shops found</h3>
                <p className="text-gray-600">
                  {selectedCategory !== "All"
                    ? `No shops have products in the "${getCategoryLabel(selectedCategory)}" category with stock available.`
                    : "Try adjusting your search or filters"}
                </p>
              </div>
            ) : (
              <div>
                {/* Category Summary */}
                {selectedCategory !== "All" && (
                  <div className="mb-6 text-center">
                    <p className="text-gray-600">
                      Showing shops with {getCategoryLabel(selectedCategory)} products in stock
                    </p>
                  </div>
                )}

                {/* Recent Section */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Recent</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {recentShops.map((shop) => {
                      const timeUntilClosure = getTimeUntilClosure(shop.final_validity_time)
                      const isOpen = isShopOpen(shop)
                      return (
                        <Link
                          key={shop.id}
                          to={isOpen ? `/shop/${shop.id}` : "#"}
                          onClick={() => isOpen && handleShopClick(shop.id)}
                          className={`${isOpen ? "" : "pointer-events-none opacity-60"} h-full block`}
                        >
                          <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-0 shadow-md h-full">
                            <div className="flex h-full">
                              <div className="relative w-32 flex-shrink-0 h-full">
                                <img
                                  src={
                                    shop.image
                                      ? getMediaUrl(shop.image)
                                      : "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"
                                  }
                                  alt={shop.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="flex-1 p-4">
                                <div className="mb-1">
                                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{shop.name}</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-2 line-clamp-1">{shop.description}</p>
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-3 text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{shop.delivery_time || "15-25 min"}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      <span className="truncate max-w-[100px]">{shop.location}</span>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={isOpen ? "default" : "secondary"}
                                    className={`text-xs ${
                                      isOpen
                                        ? "bg-green-600 hover:bg-green-700 text-white"
                                        : "bg-gray-500 hover:bg-gray-600 text-white"
                                    }`}
                                  >
                                    {isOpen ? "Open" : "Closed"}
                                  </Badge>
                                </div>
                                {isOpen && timeUntilClosure && (
                                  <div className="mt-2">
                                    <span className="text-xs text-orange-600 font-medium">
                                      Closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                                    </span>
                                  </div>
                                )}
                              </CardContent>
                            </div>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* All Shops */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">All Shops</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {displayedShops.map((shop) => {
                      const timeUntilClosure = getTimeUntilClosure(shop.final_validity_time)
                      const isOpen = isShopOpen(shop)

                      if (!shop.id) {
                        return null
                      }

                      return (
                        <Link
                          key={shop.id}
                          to={isOpen ? `/shop/${shop.id}` : "#"}
                          onClick={() => isOpen && handleShopClick(shop.id)}
                          className={`group transition-opacity duration-500 ${
                            isOpen ? "" : "pointer-events-none opacity-60"
                          }`}
                        >
                          <Card className="overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200 bg-white">
                            <div className="relative aspect-square overflow-hidden">
                              <img
                                src={
                                  shop.image
                                    ? getMediaUrl(shop.image)
                                    : "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"
                                }
                                alt={shop.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute top-2 right-2">
                                <div className="bg-white rounded-full p-1.5 shadow-md">
                                  <Heart className="h-3 w-3 text-gray-400" />
                                </div>
                              </div>
                            </div>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-1">
                                <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-purple-600 transition-colors line-clamp-1">
                                  {shop.name}
                                </h3>
                                <Badge
                                  variant={isOpen ? "default" : "secondary"}
                                  className={`text-xs ml-1 ${
                                    isOpen
                                      ? "bg-green-600 hover:bg-green-700 text-white"
                                      : "bg-gray-500 hover:bg-gray-600 text-white"
                                  }`}
                                >
                                  {isOpen ? "Open" : "Closed"}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{shop.description}</p>
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <div className="flex items-center">
                                  <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                                  <span className="font-medium">{shop.rating || 4.8}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  <span>{shop.delivery_time || "15-25 min"}</span>
                                </div>
                              </div>
                              <div className="flex items-center text-xs text-gray-500 mb-1">
                                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{shop.location}</span>
                              </div>
                              {isOpen && timeUntilClosure && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">
                                    Closes in {timeUntilClosure.hours}h {timeUntilClosure.minutes}m
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom padding for mobile */}
        <div className="h-20"></div>
      </div>
    </div>
  )
}

export default HomePage