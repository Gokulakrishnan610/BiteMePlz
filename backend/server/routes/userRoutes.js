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


const router = express.Router();



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