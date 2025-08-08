"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../../api"
import { User, AlertCircle, ArrowLeft, Mail, Shield, Wallet, Calendar, Settings, CreditCard, MapPin, Clock, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import Navbar from "../../components/Navbar"

interface UserProfile {
  _id: string
  name: string
  email: string
  role: string
  balance?: number
  createdAt?: string
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Add a small delay to prevent flash loading for fast connections
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 300))
        const profilePromise = api.get("/api/users/profile")
        
        const [_, { data }] = await Promise.all([timeoutPromise, profilePromise])
        setProfile(data)
        setLoading(false)
      } catch (err) {
        console.error("Failed to load profile:", err)
        setError("Failed to load profile")
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header skeleton */}
      <div className="bg-white shadow-sm border-b pt-20 md:pt-32">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div>
              <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile section skeleton */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="w-32 h-6 bg-white/20 rounded animate-pulse mb-2"></div>
                  <div className="w-48 h-4 bg-white/20 rounded animate-pulse mb-2"></div>
                  <div className="w-20 h-6 bg-white/20 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="w-20 h-3 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="w-24 h-3 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="w-28 h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Wallet skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div>
                  <div className="w-32 h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="w-40 h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="bg-gray-200 rounded-xl p-6 animate-pulse">
                <div className="text-center">
                  <div className="w-24 h-3 bg-gray-300 rounded animate-pulse mb-2 mx-auto"></div>
                  <div className="w-32 h-8 bg-gray-300 rounded animate-pulse mb-2 mx-auto"></div>
                  <div className="w-48 h-3 bg-gray-300 rounded animate-pulse mx-auto"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions skeleton */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border">
            <div className="p-6">
              <div className="w-32 h-5 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return <SkeletonLoader />
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 md:pt-32">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <Card className="max-w-md w-full">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                  <p className="text-red-600 mb-4 text-lg">{error}</p>
                  <Button onClick={() => window.location.reload()} className="bg-purple-600 hover:bg-purple-700">
                    Retry
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

      {/* UberEats-style Header */}
      <div className="bg-white shadow-sm border-b pt-20 md:pt-32">
  <div className="px-52 py-6">
    <div className="flex items-center mb-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-purple-600 hover:text-purple-700 transition-colors mr-4"
      >
        <ArrowLeft size={20} className="mr-2" />
        <span className="font-medium">Back</span>
      </button>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">
          Manage your profile and preferences
        </p>
      </div>
    </div>
  </div>
</div>


      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <User size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                  <p className="text-purple-100">{profile.email}</p>
                  <div className="mt-2">
                    <Badge className="bg-white/20 text-white border-0 capitalize">
                      {profile.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Mail size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{profile.email}</p>
                    </div>
                  </div>
                  
                  {profile.createdAt && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Calendar size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Member since</p>
                        <p className="font-medium text-gray-900">
                          {new Date(profile.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Shield size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Account status</p>
                      <p className="font-medium text-gray-900">Active</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email verification</p>
                      <p className="font-medium text-gray-900">Verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Balance Card */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Wallet size={24} className="text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Wallet Balance</h3>
                    <p className="text-gray-500 text-sm">Available for payments</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
                <div className="text-center">
                  <p className="text-purple-100 text-sm mb-2">Current Balance</p>
                  <p className="text-4xl font-bold">₹{profile.balance || 0}</p>
                  <p className="text-purple-100 text-sm mt-2">Use for quick payments</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => navigate("/orders")}
                  variant="outline"
                  className="h-16 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Clock size={20} className="text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">My Orders</p>
                      <p className="text-sm text-gray-500">View order history</p>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => navigate("/cart")}
                  variant="outline"
                  className="h-16 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <CreditCard size={20} className="text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Shopping Cart</p>
                      <p className="text-sm text-gray-500">View cart items</p>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => navigate("/")}
                  className="h-16 bg-purple-600 hover:bg-purple-700 text-white transition-all duration-200 md:col-span-2"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MapPin size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Continue Shopping</p>
                      <p className="text-sm text-purple-100">Browse restaurants and shops</p>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage