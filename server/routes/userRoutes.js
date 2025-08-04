import express from 'express';
import {
  authUser,
  registerUser,
  verifyOTP,
  resendOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  resendResetOTP,
  getUserProfile,
  getUsers,
  deleteUser,
  createshopAdmin,
  getshopAdmins,
  createSubShopAdmin,
  getSubShopAdmins,
  deleteSubShopAdmin,
  getUserBalance,
  updateUserBalance,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';

const router = express.Router();

// Debug endpoint for JWT configuration
router.get('/debug-jwt', (req, res) => {
  const testToken = jwt.sign({ id: 'test123' }, JWT_SECRET);
  const decoded = jwt.decode(testToken);
  const verified = jwt.verify(testToken, JWT_SECRET);
  
  res.json({
    currentSecret: JWT_SECRET,
    testToken,
    decoded,
    verified,
    envSecret: process.env.JWT_SECRET || 'Not set in env'
  });
});

// Test endpoint for JWT
router.get('/test-jwt', (req, res) => {
  const testToken = jwt.sign({ id: 'test123' }, JWT_SECRET);
  console.log('Test token generated:', testToken);
  
  try {
    const decoded = jwt.verify(testToken, JWT_SECRET);
    console.log('Test token verified:', decoded);
    res.json({ success: true, token: testToken, decoded });
  } catch (error) {
    console.error('Test token verification failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Authentication routes
router.post('/register', registerUser);
router.post('/login', authUser);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);
router.post('/resend-reset-otp', resendResetOTP);

// Protected routes
router.route('/profile').get(protect, getUserProfile);
router.route('/shop-admin').post(protect, admin, createshopAdmin);
router.route('/shop-admins').get(protect, admin, getshopAdmins);
router.route('/:id').delete(protect, admin, deleteUser);
router.get('/', protect, admin, getUsers);
router.get('/balance', protect, getUserBalance);
router.put('/balance', protect, updateUserBalance);

// Sub-shop admin routes (only accessible by shop admins)
router.route('/sub-shop-admin').post(protect, createSubShopAdmin);
router.route('/sub-shop-admins').get(protect, getSubShopAdmins);
router.route('/sub-shop-admin/:id').delete(protect, deleteSubShopAdmin);

export default router;