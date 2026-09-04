"use client"

import Lottie from "lottie-react"
import HeartAnimation from "./heart.json"

const Footer = () => {
  return (
    <footer className="bg-white py-6 w-full border-0">
      <div className="flex flex-col items-center justify-center w-full h-20 relative">
        <div className="font-medium text-foreground/70 flex items-center space-x-2">
          Made with
          <Lottie animationData={HeartAnimation} loop={true} className="w-14 p-0 m-0" />
          by GK
        </div>
      </div>
    </footer>
  )
}

export default Footer
