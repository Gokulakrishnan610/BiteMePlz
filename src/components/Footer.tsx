import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Heart, Github, Twitter, Mail } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--secondary-bg)] border-t border-[var(--border-color)] mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Zap className="text-[var(--accent-purple)]" size={28} />
              <h3 className="text-2xl font-bold gradient-text">Campus Kiosk</h3>
            </div>
            <p className="text-[var(--secondary-text)] mb-6 max-w-md leading-relaxed">
              Your ultimate digital marketplace for campus shopping. Quick, convenient, and secure transactions designed specifically for the campus community.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="p-2 bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 transition-all duration-200"
              >
                <Github size={20} className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)]" />
              </a>
              <a 
                href="#" 
                className="p-2 bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 transition-all duration-200"
              >
                <Twitter size={20} className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)]" />
              </a>
              <a 
                href="#" 
                className="p-2 bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 transition-all duration-200"
              >
                <Mail size={20} className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)]" />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-[var(--primary-text)] mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/" 
                  className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 flex items-center group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[var(--accent-purple)] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/cart" 
                  className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 flex items-center group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[var(--accent-purple)] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                  Cart
                </Link>
              </li>
              <li>
                <Link 
                  to="/orders" 
                  className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 flex items-center group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[var(--accent-purple)] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                  My Orders
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Support */}
          <div>
            <h4 className="font-semibold text-[var(--primary-text)] mb-4">Support</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="#" 
                  className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 flex items-center group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[var(--accent-purple)] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                  Help Center
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 flex items-center group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[var(--accent-purple)] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                  Terms of Service
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-[var(--secondary-text)] hover:text-[var(--accent-purple)] transition-colors duration-200 flex items-center group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[var(--accent-purple)] transition-all duration-200 mr-0 group-hover:mr-2"></span>
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-[var(--border-color)] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-[var(--muted-text)] text-sm">
            &copy; {currentYear} Campus Kiosk. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex items-center space-x-2">
            <span className="text-[var(--muted-text)] text-sm">Made with</span>
            <Heart size={16} className="text-red-500 animate-pulse" />
            <span className="text-[var(--muted-text)] text-sm">for campus convenience</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;