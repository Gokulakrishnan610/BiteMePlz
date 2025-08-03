import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { UserService } from '../services/databaseService.js';
import { JWT_SECRET } from '../config/jwt.js';

/**
 * Middleware to verify JWT token and attach user to request
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token
      token = req.headers.authorization.split(' ')[1];

      // Decode token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from Supabase by ID - handle both id and _id fields
      const userId = decoded.id || decoded._id;
      const user = await UserService.findById(userId);

      if (!user) {
        console.error('User not found for token:', {
          decodedId: decoded.id,
          decoded_id: decoded._id,
          userId: userId,
          token: token.substring(0, 20) + '...'
        });
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification failed:', {
        error: error.message,
        token: token ? token.substring(0, 20) + '...' : 'No token',
        secret: JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : 'No secret'
      });
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

/**
 * Middleware to verify if user is an admin
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
};

/**
 * Middleware to verify if user is a shop admin
 */
const shopAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'shopAdmin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a shop admin');
  }
};

export { protect, admin, shopAdmin };
