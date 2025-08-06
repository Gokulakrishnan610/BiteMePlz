"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api from "../api"
import { Search, MapPin, Clock, Star, Coffee, Utensils, Cookie, BookOpen, Smartphone, Package } from "lucide-react"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import Navbar from "../components/Navbar"
import SimpleLoading from "../components/SimpleLoading"


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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isFiltering, setIsFiltering] = useState(false)

  const [componentsLoaded, setComponentsLoaded] = useState(0)

  // Fetch available categories from products
  const fetchAvailableCategories = async () => {
    try {
      const { data } = await api.get("/api/products/")
      const products = data.results || data

      if (Array.isArray(products)) {
        // Get unique categories from products that are available and in stock
        const categories = new Set<string>()

        products.forEach((product: Product) => {
          if (product.is_available && product.stock > 0 && product.category) {
            categories.add(product.category.toLowerCase())
          }
        })

        // Sort categories alphabetically for better UX
        const sortedCategories = Array.from(categories).sort()
        const categoryArray = ["All", ...sortedCategories]
        setAvailableCategories(categoryArray)
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
      // Fallback to default categories if API fails
      setAvailableCategories(["All", "beverages", "electronics", "food", "others", "snacks", "stationery"])
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both shops and categories
        await Promise.all([fetchShops(), fetchAvailableCategories()])
        setLoading(false)
      } catch (err) {
        setError("Failed to load data")
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchShops = async () => {
    try {
      const { data } = await api.get("/api/shops/")
      const shopsData = data.results || data
      setShops(Array.isArray(shopsData) ? shopsData : [])
      setFilteredShops(Array.isArray(shopsData) ? shopsData : [])
    } catch (err) {
      throw new Error("Failed to load shops")
    }
  }

  useEffect(() => {
    const filterShops = async () => {
      setIsFiltering(true)
      let filtered = shops

      if (selectedCategory !== "All") {
        // Filter shops that have products in the selected category with stock
        try {
          const { data } = await api.get("/api/products/", {
            params: {
              category: selectedCategory.toLowerCase(),
              is_available: true,
              stock__gt: 0, // Products with stock greater than 0
            },
          })

          const products = data.results || data
          console.log(`Found ${products.length} products for category: ${selectedCategory}`)
          console.log('Products:', products)
          
          const shopIdsWithCategory = new Set(products.map((product: Product) => product.shop.id))
          console.log('Shop IDs with category:', Array.from(shopIdsWithCategory))
          console.log('Available shops:', shops.map(shop => ({ id: shop.id, name: shop.name })))

          filtered = shops.filter((shop) => shopIdsWithCategory.has(shop.id))
          console.log(`Filtered to ${filtered.length} shops`)
        } catch (error) {
          console.error("Failed to filter shops by category:", error)
          // Fallback to original filtering method
          filtered = shops.filter((shop) => {
            return shop.category === selectedCategory || shop.category === selectedCategory.toLowerCase()
          })
        }
      }

      if (searchQuery) {
        filtered = filtered.filter(
          (shop) =>
            shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shop.description.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      }

      setFilteredShops(filtered)
      setIsFiltering(false)
    }

    filterShops()
  }, [shops, selectedCategory, searchQuery])

  // Add this useEffect for component loading animation
  useEffect(() => {
    if (!loading) {
      const components = [
        () => setComponentsLoaded(1), // Navbar
        () => setComponentsLoaded(2), // Search bar
        () => setComponentsLoaded(3), // Categories
        () => setComponentsLoaded(4), // First row of cards
        () => setComponentsLoaded(5), // All cards
      ]

      components.forEach((component, index) => {
        setTimeout(component, (index + 1) * 800)
      })
    }
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
    // Check if shop is marked as open
    if (!shop.is_open) return false
    
    // Check if shop has passed its final validity time
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



  if (loading) {
    return <SimpleLoading />
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
      <Navbar />

      {/* Header with fade-in animation */}
      <div
        className={`pt-32 md:pt-40 bg-white border-b border-gray-200 transition-opacity duration-500 ${componentsLoaded >= 1 ? "opacity-100" : "opacity-0"}`}
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
        className={`max-w-7xl mx-auto px-4 py-4 transition-opacity duration-500 ${componentsLoaded >= 2 ? "opacity-100" : "opacity-0"}`}
      >
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {availableCategories.map((category) => {
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
        className={`max-w-7xl mx-auto px-4 pb-8 transition-opacity duration-500 ${componentsLoaded >= 3 ? "opacity-100" : "opacity-0"}`}
      >
        {isFiltering ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Finding shops with {getCategoryLabel(selectedCategory)}...</p>
          </div>
        ) : filteredShops.length === 0 ? (
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
            {filteredShops.map((shop, index) => {
              const timeUntilClosure = getTimeUntilClosure(shop.final_validity_time)
              const isOpen = isShopOpen(shop)
              const cardDelay = Math.floor(index / 4) * 200 + (index % 4) * 100

              if (!shop.id) {
                console.warn(`Shop ${shop.name} has no valid ID, skipping`)
                return null
              }

              return (
                <Link
                  key={shop.id}
                  to={isOpen ? `/shop/${shop.id}` : '#'}
                  className={`group transition-opacity duration-500 h-full ${isOpen ? '' : 'pointer-events-none opacity-60'} ${
                    componentsLoaded >= 4 + Math.floor(index / 4) ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ transitionDelay: `${cardDelay}ms` }}
                >
                  <Card className="overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200 bg-white font-sans h-full flex flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden flex-shrink-0">
                      <img
                        src={shop.image || "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg"}
                        alt={shop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />

                      {isOpen && (
                        <Badge className="absolute top-2 left-2 bg-green-600 hover:bg-green-600 text-white text-xs">
                          Open
                        </Badge>
                      )}
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
  )
}

export default HomePage;
