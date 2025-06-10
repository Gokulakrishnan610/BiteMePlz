import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// JWT Configuration
const JWT_SECRET = 'test-secret-123';
const JWT_EXPIRES_IN = '30d';

// Log the configuration
console.log('JWT Configuration:', {
  secret: JWT_SECRET,
  secretLength: JWT_SECRET.length
});

export { JWT_SECRET, JWT_EXPIRES_IN }; 