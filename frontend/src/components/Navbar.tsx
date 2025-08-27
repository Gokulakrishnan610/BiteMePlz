"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { MenuIcon, X } from "lucide-react"
import { useAuth } from "../context/AuthContext"

// Navbar Components
interface HoveredLinkProps {
  children: React.ReactNode;
  href: string;
  [key: string]: unknown;
}

const HoveredLink = ({ children, href, ...rest }: HoveredLinkProps) => {
    return (
        <Link
        {...rest}
        to={href}
        className="text-gray-700 hover:text-purple-600 transition-colors duration-200"
        >
        {children}
        </Link>
    )
}

interface NavbarProps {
    className?: string
}

export default function Navbar({ className }: NavbarProps) {
    const [active, setActive] = useState<string | null>(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        if (user?.role === 'admin') {
          navigate('/kisok-ac-back-office/login')
        } else if (user?.role === 'shopAdmin') {
          navigate('/kisok-sp-back-office/login')
        } else if (user?.role === 'parent') {
          navigate('/parent-login')
        } else {
          navigate('/login')
        }
    }

    return (
        <>
        {/* Desktop Navbar */}
        <div
            className={`navbar fixed top-2 sm:top-3 md:top-4 lg:top-4 xl:top-5 inset-x-0 max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto z-50 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 hidden md:block ${className || ""}`}
            onMouseLeave={() => setActive(null)}
        >
            <div className="relative rounded-full border border-gray-200 bg-white/95 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-between px-3 sm:px-4 lg:px-6 xl:px-8 py-1 sm:py-1.5 lg:py-1.5 xl:py-2">
            {/* Logo Section */}
            <div className="flex items-center flex-shrink-0">
                <Link to="/" className="flex items-center">
                <img
                    src="/images/rec college.png"
                    alt="REC Logo"
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-14 lg:h-14 xl:w-16 xl:h-16 object-contain"
                />
                </Link>
            </div>

            {/* Left spacer for balance */}
            <div className="w-12 sm:w-14 md:w-16 lg:w-14 xl:w-16 flex-shrink-0"></div>

            {/* Account Dropdown - Right Side */}
            <div className="flex items-center">
                <div className="relative">
                <button
                    onClick={() => setActive(active === "Account" ? null : "Account")}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                >
                   <MenuIcon size={20} className="text-gray-700 navbar-icon" />
                </button>
                {active === "Account" && (
                    <div className="absolute top-[calc(100%_+_1.2rem)] right-0 pt-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <div className="bg-white backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200 shadow-xl min-w-[200px] lg:min-w-[250px] xl:min-w-[280px]">
                        <div className="p-4 lg:p-5">
                        <div className="flex flex-col space-y-3 lg:space-y-4 text-sm lg:text-base">
                            {user && (user.role === 'admin' || user.role === 'shopAdmin') && (
                                <HoveredLink href={user.role === 'admin' ? '/kisok-ac-back-office' : '/kisok-sp-back-office'}>Dashboard</HoveredLink>
                            )}
                            {user && user.role === 'parent' && (
                                <HoveredLink href="/profile">Parent Dashboard</HoveredLink>
                            )}
                            <HoveredLink href="/profile">Profile</HoveredLink>
                            <HoveredLink href="/orders">My Orders</HoveredLink>
                            <HoveredLink href="/cart">Shopping Cart</HoveredLink>
                            <button
                            onClick={handleLogout}
                            className="text-left text-red-600 hover:text-purple-600 transition-all duration-200 text-sm px-2 py-1 -mx-2 -my-1 rounded hover:bg-purple-50 hover:translate-x-1"
                            >
                            Logout
                            </button>
                        </div>
                        </div>
                    </div>
                    </div>
                )}
                </div>
            </div>
            </div>
        </div>

        {/* Mobile Navbar */}
        <div className="navbar fixed top-4 left-4 right-4 z-50 md:hidden" onMouseLeave={() => setActive(null)}>
            <div className="relative bg-white/95 backdrop-blur-md rounded-full border border-gray-200 shadow-lg px-4 py-3 flex items-center justify-between">
            {/* Mobile Logo */}
            <Link to="/" className="flex items-center">
                <img
                src="/images/rec college.png"
                alt="REC Logo"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                />
            </Link>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
                {isMobileMenuOpen ? (
                <X size={20} className="text-gray-700 navbar-icon" />
                ) : (
                <MenuIcon size={20} className="text-gray-700 navbar-icon" />
                )}
            </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setIsMobileMenuOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-4 max-h-[70vh] overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-300 z-40">
                <div className="space-y-6">
                {/* Account Section */}
                <div>
                    <h3 className="font-semibold text-purple-600 mb-3 text-base">Settings</h3>
                    <div className="space-y-2 pl-4">
                    {user && (user.role === 'admin' || user.role === 'shopAdmin') && (
                        <div className="py-2">
                            <HoveredLink href={user.role === 'admin' ? '/kisok-ac-back-office' : '/kisok-sp-back-office'}>Dashboard</HoveredLink>
                        </div>
                    )}
                    {user && user.role === 'parent' && (
                        <div className="py-2">
                            <HoveredLink href="/profile">Parent Dashboard</HoveredLink>
                        </div>
                    )}
                    {user && user.role === 'shopAdmin' && (
                        <div className="py-2">
                            <HoveredLink href="/kisok-sp-back-office/order-verification">Order Verification</HoveredLink>
                        </div>
                    )}
                    <div className="py-2">
                        <HoveredLink href="/profile">Profile</HoveredLink>
                    </div>
                    <div className="py-2">
                        <HoveredLink href="/orders">My Orders</HoveredLink>
                    </div>
                    <div className="py-2">
                        <HoveredLink href="/cart">Shopping Cart</HoveredLink>
                    </div>

                    <div className="py-2 border-t border-gray-200 pt-4 mt-4">
                        <button
                        onClick={handleLogout}
                        className="text-left text-red-600 hover:text-purple-600 transition-all duration-200 text-sm w-full px-2 py-1 -mx-2 -my-1 rounded hover:bg-purple-50 hover:translate-x-1"
                        >
                        Logout
                        </button>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </>
            )}
        </div>
        </>
    )
}
