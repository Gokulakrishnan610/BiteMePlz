import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';

const generateToken = (id) => {
  console.log('Generating token with:', {
    userId: id,
    secret: JWT_SECRET
  });

  const token = jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  // Verify the token immediately after generation
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token generated and verified:', {
      token: token.substring(0, 20) + '...',
      decoded
    });
  } catch (error) {
    console.error('Failed to verify generated token:', error);
  }

  return token;
};

export default generateToken;