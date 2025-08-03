import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';

const generateToken = (id) => {
  console.log('Generating token with:', {
    userId: id,
    secret: JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'No secret'
  });

  const token = jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  console.log('Token generated successfully:', {
    token: token.substring(0, 20) + '...',
    expiresIn: JWT_EXPIRES_IN
  });

  return token;
};

export default generateToken;