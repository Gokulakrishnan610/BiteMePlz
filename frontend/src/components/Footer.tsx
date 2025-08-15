"use client"

import { useState, useEffect } from "react"
import Lottie from "lottie-react"
import HeartAnimation from "./heart.json"

const Footer = () => {
  const [currentText, setCurrentText] = useState("Labs")
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      // Start fade out
      setIsVisible(false)

      // After fade out completes, change text and fade in
      setTimeout(() => {
        setCurrentText((prev) => (prev === "Labs" ? "Rec" : "Labs"))
        setIsVisible(true)
      }, 300) // Wait for fade out to complete
    }, 2000) // Change every 2 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <footer className="bg-white py-6 w-full border-0">
      <div className="flex flex-col items-center justify-center w-full h-20 relative">
        <div className="font-medium text-foreground/70 flex items-center space-x-2">
          Made with
          <Lottie animationData={HeartAnimation} loop={true} className="w-14 p-0 m-0" />
          by Devs
          <span className={`ml-3 transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
            {currentText}
          </span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
