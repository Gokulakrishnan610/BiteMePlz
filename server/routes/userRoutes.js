import express from 'express';
import {
  authUser,
  registerUser,
  verifyOTP,
  resendOTP,
  getUserProfile,
  getUsers,
  deleteUser,
  createShopAdmin,
  getShopAdmins,
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

router.post('/register', (req, res) => {
  const formData = req.body;
  console.log('Received registration data:', formData);
  
  // Call the original registerUser function with the new fields
  registerUser(req, res, {
    name: formData.name,
    email: formData.email,
    password: formData.password,
    shopName: formData.shopName,
    shopDescription: formData.shopDescription,
    shopLocation: formData.shopLocation,
    finalValidityTime: formData.finalValidityTime,
    shopImage: formData.shopImage || undefined,
  });
});

router.post('/login', authUser);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.route('/profile').get(protect, getUserProfile);
router.post('/shop-admin', createShopAdmin);
router.route('/shop-admins').get(protect, admin, getShopAdmins);
router.route('/:id').delete(protect, admin, deleteUser);
router.get('/', protect, admin, getUsers);
router.get('/balance', protect, getUserBalance);
router.put('/balance', protect, updateUserBalance);

export default router;