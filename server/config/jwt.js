// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Log the configuration
console.log('JWT Configuration:', {
  secret: JWT_SECRET,
  secretLength: JWT_SECRET.length
});

export { JWT_SECRET, JWT_EXPIRES_IN }; 