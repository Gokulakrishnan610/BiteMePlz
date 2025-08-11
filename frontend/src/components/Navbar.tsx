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
        className="text-neutral-700 dark:text-neutral-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
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
        navigate("/login")
    }

    return (
        <>
        {/* Desktop Navbar */}
        <div
            className={`fixed top-4 sm:top-6 md:top-8 lg:top-8 xl:top-10 inset-x-0 max-w-xs sm:max-w-sm md:max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto z-50 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 hidden md:block ${className || ""}`}
            onMouseLeave={() => setActive(null)}
        >
            <div className="relative rounded-full border border-gray-200 dark:border-white/[0.2] bg-white/90 dark:bg-white/90 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 py-1.5 sm:py-2 lg:py-2 xl:py-2.5">
            {/* Logo Section */}
            <div className="flex items-center flex-shrink-0">
                <Link to="/" className="flex items-center">
                <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rec%20college-DNQmI7rcIxK8zqroLBTQwojwQlMG4x.png"
                    alt="REC Logo"
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-16 lg:h-16 xl:w-18 xl:h-18 object-contain"
                />
                </Link>
            </div>

            {/* Left spacer for balance */}
            <div className="w-14 sm:w-16 md:w-18 lg:w-16 xl:w-18 flex-shrink-0"></div>

            {/* Account Dropdown - Right Side */}
            <div className="flex items-center">
                <div className="relative">
                <button
                    onClick={() => setActive(active === "Account" ? null : "Account")}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                   <MenuIcon size={20} className="text-gray-700 dark:text-gray-300" />
                </button>
                {active === "Account" && (
                    <div className="absolute top-[calc(100%_+_1.2rem)] right-0 pt-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <div className="bg-white dark:bg-black backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-200 dark:border-white/[0.2] shadow-xl min-w-[200px] lg:min-w-[250px] xl:min-w-[280px]">
                        <div className="p-4 lg:p-5">
                        <div className="flex flex-col space-y-3 lg:space-y-4 text-sm lg:text-base">
                            {user && (user.role === 'admin' || user.role === 'shopAdmin') && (
                                <HoveredLink href={user.role === 'admin' ? '/kisok-ac-back-office' : '/kisok-sp-back-office'}>Dashboard</HoveredLink>
                            )}
                            <HoveredLink href="/profile">Profile</HoveredLink>
                            <HoveredLink href="/orders">My Orders</HoveredLink>
                            <HoveredLink href="/cart">Shopping Cart</HoveredLink>
                            <button
                            onClick={handleLogout}
                            className="text-left text-red-600 hover:text-purple-600 dark:text-red-400 dark:hover:text-purple-400 transition-all duration-200 text-sm px-2 py-1 -mx-2 -my-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:translate-x-1"
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
        <div className="fixed top-4 left-4 right-4 z-50 md:hidden" onMouseLeave={() => setActive(null)}>
            <div className="bg-white/90 dark:bg-white/90 backdrop-blur-md rounded-full border border-gray-200 dark:border-white/[0.2] shadow-lg px-4 py-3 flex items-center justify-between">
            {/* Mobile Logo */}
            <Link to="/" className="flex items-center">
                <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rec%20college-DNQmI7rcIxK8zqroLBTQwojwQlMG4x.png"
                alt="REC Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                />
            </Link>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
            >
                {isMobileMenuOpen ? (
                <X size={20} className="text-gray-700 dark:text-gray-300" />
                ) : (
<MenuIcon size={20} className="text-gray-700 dark:text-gray-300" />                )}
            </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
            <div className="mt-2 bg-white/95 dark:bg-white  /95 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/[0.2] shadow-xl p-4 max-h-[80vh] overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-300">
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
                    <div className="py-2">
                        <HoveredLink href="/profile">Profile</HoveredLink>
                    </div>
                    <div className="py-2">
                        <HoveredLink href="/orders">My Orders</HoveredLink>
                    </div>
                    <div className="py-2">
                        <HoveredLink href="/cart">Shopping Cart</HoveredLink>
                    </div>

                    <div className="py-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <button
                        onClick={handleLogout}
                        className="text-left text-red-600 hover:text-purple-600 dark:text-red-400 dark:hover:text-purple-400 transition-all duration-200 text-sm w-full px-2 py-1 -mx-2 -my-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:translate-x-1"
                        >
                        Logout
                        </button>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            )}
        </div>
        </>
    )
    }
