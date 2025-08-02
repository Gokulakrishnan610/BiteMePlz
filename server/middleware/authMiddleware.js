import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { UserService } from '../services/databaseService.js';
import { JWT_SECRET } from '../config/jwt.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from the token
      const user = await UserService.findById(decoded.id);
      
      if (!user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification failed:', {
        error: error.message,
        token: token ? token.substring(0, 20) + '...' : 'No token'
      });
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as an admin');
  }
};

const shopAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'shopAdmin') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as a shop admin');
  }
};

export { protect, admin, shopAdmin };