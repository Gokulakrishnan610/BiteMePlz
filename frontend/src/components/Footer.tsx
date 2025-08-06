"use client"

import type React from "react"
import { Heart } from "lucide-react"

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 text-sm">Made with</span>
            <Heart size={14} className="text-red-500 animate-pulse" />
            <span className="text-gray-500 text-sm">by</span>
            <span className="text-purple-600 font-medium">DEVS Developers</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer