import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--gray-800)] text-white py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Kiosk Webapp</h3>
            <p className="text-[var(--gray-400)] mb-4">
              A comprehensive platform connecting students with campus shops for convenient purchases.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-[var(--gray-400)] hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-[var(--gray-400)] hover:text-white transition-colors">
                  Cart
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-[var(--gray-400)] hover:text-white transition-colors">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-[var(--gray-400)] hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-[var(--gray-400)] hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-[var(--gray-700)] mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-[var(--gray-400)] text-sm">
            &copy; {currentYear} Kiosk Webapp. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <p className="text-[var(--gray-400)] text-sm">
              Made with ❤️ for campus convenience
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;