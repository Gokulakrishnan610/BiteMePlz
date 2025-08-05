import React from "react";
import { cn } from "../../utils/cn";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

export function Navbar({ children, className }: NavbarProps) {
  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/75 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-900/75",
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </nav>
  );
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function NavBody({ children, className }: NavBodyProps) {
  return (
    <div className={cn("flex h-16 items-center justify-between", className)}>
      {children}
    </div>
  );
}

interface NavItemsProps {
  items: Array<{ name: string; link: string }>;
  className?: string;
}

export function NavItems({ items, className }: NavItemsProps) {
  return (
    <div className={cn("hidden md:flex items-center space-x-8", className)}>
      {items.map((item, idx) => (
        <a
          key={`nav-item-${idx}`}
          href={item.link}
          className="relative text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <span className="block">{item.name}</span>
        </a>
      ))}
    </div>
  );
}

interface NavbarLogoProps {
  className?: string;
}

export function NavbarLogo({ className }: NavbarLogoProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">R</span>
      </div>
      <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
        REC Eats
      </span>
    </div>
  );
}

interface NavbarButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
}

export function NavbarButton({ 
  children, 
  variant = "primary", 
  className,
  onClick 
}: NavbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        variant === "primary" && "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200",
        variant === "secondary" && "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100",
        className
      )}
    >
      {children}
    </button>
  );
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileNav({ children, className }: MobileNavProps) {
  return (
    <div className={cn("md:hidden", className)}>
      {children}
    </div>
  );
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileNavHeader({ children, className }: MobileNavHeaderProps) {
  return (
    <div className={cn("flex h-16 items-center justify-between", className)}>
      {children}
    </div>
  );
}

interface MobileNavToggleProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export function MobileNavToggle({ isOpen, onClick, className }: MobileNavToggleProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-6 w-6 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100",
        className
      )}
    >
      <span className="sr-only">Open main menu</span>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "absolute h-0.5 w-6 transform bg-neutral-600 transition-all duration-300 dark:bg-neutral-300",
            isOpen ? "rotate-45" : "-translate-y-2"
          )}
        />
        <span
          className={cn(
            "absolute h-0.5 w-6 transform bg-neutral-600 transition-all duration-300 dark:bg-neutral-300",
            isOpen ? "opacity-0" : ""
          )}
        />
        <span
          className={cn(
            "absolute h-0.5 w-6 transform bg-neutral-600 transition-all duration-300 dark:bg-neutral-300",
            isOpen ? "-rotate-45" : "translate-y-2"
          )}
        />
      </div>
    </button>
  );
}

interface MobileNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function MobileNavMenu({ isOpen, onClose, children, className }: MobileNavMenuProps) {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-16 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-900/95",
        isOpen ? "block" : "hidden",
        className
      )}
    >
      <div className="px-4 py-6 space-y-4">
        {children}
      </div>
    </div>
  );
} 