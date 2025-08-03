import asyncHandler from 'express-async-handler';
import { UserService } from '../services/databaseService.js';
import { ShopService } from '../services/databaseService.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import { logTransaction } from '../utils/transactionLogger.js';
import WalletService from '../utils/walletService.js';
import bcrypt from 'bcryptjs'; // Added bcrypt import

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register a new user and send OTP
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, rollNo, password } = req.body;

  const userExists = await UserService.findByEmail(email) || await UserService.findByRollNo(rollNo);

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

  const user = await UserService.create({
    name,
    email,
    roll_no: rollNo,
    password,
    otp: {
      code: otp,
      expiresAt: otpExpiry
    }
  });

  if (user) {
    try {
      // Send OTP via email
      await sendEmail(
        email,
        "Email Verification OTP",
        `Your OTP for email verification is: ${otp}\nThis OTP will expire in 10 minutes.`
      );

      res.status(201).json({
        message: "OTP sent to your email",
        userId: user.id
      });
    } catch (error) {
      // If email fails to send, delete the user and throw error
      await UserService.findByIdAndDelete(user.id);
      res.status(500);
      throw new Error('Failed to send OTP email');
    }
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Verify OTP and activate account
// @route   POST /api/users/verify-otp
// @access  Public
const verifyOTP = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  const user = await UserService.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.otp || !user.otp.code || !user.otp.expiresAt) {
    res.status(400);
    throw new Error('OTP not found or expired');
  }

  if (new Date() > user.otp.expiresAt) {
    res.status(400);
    throw new Error('OTP has expired');
  }

  if (user.otp.code !== otp) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  await UserService.findByIdAndUpdate(user.id, {
    is_verified: true,
    otp: null
  });

  res.json({
    _id: user.id,
    name: user.name,
    email: user.email,
    rollNo: user.roll_no,
    role: user.role,
    token: generateToken(user.id),
  });
});

// @desc    Resend OTP
// @route   POST /api/users/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await UserService.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.is_verified) {
    res.status(400);
    throw new Error('User is already verified');
  }

  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

  await UserService.findByIdAndUpdate(user.id, {
    otp: {
      code: otp,
      expiresAt: otpExpiry
    }
  });

  try {
    await sendEmail(
      user.email,
      "Email Verification OTP",
      `Your new OTP for email verification is: ${otp}\nThis OTP will expire in 10 minutes.`
    );

    res.json({ message: "New OTP sent to your email" });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to send OTP email');
  }
});

// @desc    Forgot Password - Send OTP to email
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const user = await UserService.findByEmail(email);

  if (!user) {
    res.status(404);
    throw new Error('No account found with this email address');
  }

  if (!user.is_verified) {
    res.status(400);
    throw new Error('Please verify your email first before resetting password');
  }

  // Generate OTP for password reset
  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

  await UserService.findByIdAndUpdate(user.id, {
    password_reset_otp: {
      code: otp,
      expiresAt: otpExpiry
    }
  });

  try {
    await sendEmail(
      email,
      "Password Reset OTP",
      `Your OTP for password reset is: ${otp}\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
    );

    res.json({
      message: "Password reset OTP sent to your email",
      userId: user.id
    });
  } catch (error) {
    // Clear the OTP if email fails
    await UserService.findByIdAndUpdate(user.id, {
      password_reset_otp: null
    });
    res.status(500);
    throw new Error('Failed to send password reset email');
  }
});

// @desc    Verify Password Reset OTP
// @route   POST /api/users/verify-reset-otp
// @access  Public
const verifyResetOTP = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    res.status(400);
    throw new Error('User ID and OTP are required');
  }

  const user = await UserService.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.password_reset_otp || !user.password_reset_otp.code || !user.password_reset_otp.expiresAt) {
    res.status(400);
    throw new Error('Password reset OTP not found or expired');
  }

  if (new Date() > user.password_reset_otp.expiresAt) {
    res.status(400);
    throw new Error('Password reset OTP has expired');
  }

  if (user.password_reset_otp.code !== otp) {
    res.status(400);
    throw new Error('Invalid OTP');
  }

  // OTP is valid, generate a temporary reset token
  const resetToken = generateOTP(); // Using OTP generator for simplicity
  const resetTokenExpiry = new Date();
  resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 15); // 15 minutes to reset password

  await UserService.findByIdAndUpdate(user.id, {
    password_reset_token: {
      token: resetToken,
      expiresAt: resetTokenExpiry
    },
    password_reset_otp: null // Clear the OTP
  });

  res.json({
    message: "OTP verified successfully",
    resetToken,
    userId: user.id
  });
});

// @desc    Reset Password
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { userId, resetToken, newPassword } = req.body;

  if (!userId || !resetToken || !newPassword) {
    res.status(400);
    throw new Error('User ID, reset token, and new password are required');
  }

  if (newPassword.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long');
  }

  const user = await UserService.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!user.password_reset_token || !user.password_reset_token.token || !user.password_reset_token.expiresAt) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  if (new Date() > user.password_reset_token.expiresAt) {
    res.status(400);
    throw new Error('Reset token has expired');
  }

  if (user.password_reset_token.token !== resetToken) {
    res.status(400);
    throw new Error('Invalid reset token');
  }

  // Reset the password
  await UserService.findByIdAndUpdate(user.id, {
    password: newPassword,
    password_reset_token: null
  });

  res.json({
    message: "Password reset successfully",
    _id: user.id,
    name: user.name,
    email: user.email,
    rollNo: user.roll_no,
    role: user.role,
    token: generateToken(user.id),
  });
});

// @desc    Resend Password Reset OTP
// @route   POST /api/users/resend-reset-otp
// @access  Public
const resendResetOTP = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error('User ID is required');
  }

  const user = await UserService.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Generate new OTP
  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

  await UserService.findByIdAndUpdate(user.id, {
    password_reset_otp: {
      code: otp,
      expiresAt: otpExpiry
    }
  });

  try {
    await sendEmail(
      user.email,
      "Password Reset OTP",
      `Your new OTP for password reset is: ${otp}\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
    );

    res.json({ message: "New password reset OTP sent to your email" });
  } catch (error) {
    res.status(500);
    throw new Error('Failed to send password reset email');
  }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await UserService.findByEmail(email);

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.is_verified) {
    res.status(401);
    throw new Error('Please verify your email first');
  }

  // Compare password using bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (isPasswordValid) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      rollNo: user.roll_no,
      role: user.role,
      shop: user.shop,
      token: generateToken(user.id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  // Debug: Log the user object to see its structure
  console.log('User object in getUserProfile:', req.user);
  
  // Check if user has id or _id field
  const userId = req.user.id || req.user._id;
  if (!userId) {
    console.error('No user ID found in req.user:', req.user);
    res.status(400);
    throw new Error('User ID not found in request');
  }
  
  const user = await UserService.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Avoid returning invalid shop object if it's broken/missing
  let shop = null;
  if (user.shop) {
    try {
      // Try to load the shop safely, avoid throwing
      shop = await ShopService.findById(user.shop);
    } catch (err) {
      console.error('⚠ Error loading shop for user:', err.message);
      shop = null;
    }
  }

  res.json({
    _id: user.id,
    name: user.name,
    email: user.email,
    rollNo: user.roll_no,
    role: user.role,
    shop: shop ? {
      id: shop.id,
      name: shop.name,
      location: shop.location,
      image: shop.image,
      is_open: shop.is_open,
      next_opening_time: shop.next_opening_time ?? null,
      // add other safe fields as needed
    } : null,
    balance: user.balance,
  });
});


// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await UserService.find({});
  res.json(users);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await UserService.findById(req.params.id);

  if (user) {
    if (user.role === 'admin') {
      res.status(400);
      throw new Error('Cannot delete admin user');
    }

    // If user is a shop admin, handle shop deletion
    if (user.role === 'shopAdmin' && user.shop) {
      const shop = await ShopService.findById(user.shop);
      if (shop) {
        await ShopService.findByIdAndDelete(shop.id);
      }
    }

    await UserService.findByIdAndDelete(user.id);
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Create a new shop admin
// @route   POST /api/users/shop-admin
// @access  Private/Admin
  const createShopAdmin = asyncHandler(async (req, res) => {
    const { 
      name, 
      email, 
      password, 
      shopName, 
      shopDescription, 
      shopLocation, 
      shopImage,
      finalValidityTime,
      qrValidityMinutes
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !shopName || !shopDescription || !shopLocation) {
      res.status(400);
      throw new Error('Please fill in all required fields');
    }

    // Validate finalValidityTime
    if (!finalValidityTime) {
      res.status(400);
      throw new Error('Final validity time is required');
    }

    // Validate QR validity minutes
    const qrMinutes = parseInt(qrValidityMinutes) || 20;
    if (qrMinutes < 1 || qrMinutes > 60) {
      res.status(400);
      throw new Error('QR validity must be between 1 and 60 minutes');
    }

    // Check if user already exists
    const userExists = await UserService.findByEmail(email);

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Generate a unique roll number for shop admin
    const rollNo = `SHOP${Date.now().toString().slice(-6)}`;

    let createdUser = null;
    let createdShop = null;

    try {
      // Create user first
      createdUser = await UserService.create({
        name,
        email,
        roll_no: rollNo,
        password,
        role: 'shopAdmin',
        is_verified: true, // Shop admin accounts are pre-verified
      });

      // Create shop with user reference
      createdShop = await ShopService.create({
        name: shopName,
        description: shopDescription,
        location: shopLocation,
        image: shopImage || '/uploads/default-shop.jpg',
        is_active: true,
        is_open: true,
        shop_admin: createdUser.id,
        final_validity_time: new Date(finalValidityTime),
        qr_validity_minutes: qrMinutes
      });

      // Update user with shop reference
      await UserService.findByIdAndUpdate(createdUser.id, {
        shop: createdShop.id
      });

      res.status(201).json({
        _id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        rollNo: createdUser.roll_no,
        role: createdUser.role,
        shop: createdShop.id,
        token: generateToken(createdUser.id),
      });
    } catch (error) {
      // Clean up if any error occurs
      if (createdUser) {
        await UserService.findByIdAndDelete(createdUser.id);
      }
      if (createdShop) {
        await ShopService.findByIdAndDelete(createdShop.id);
      }
      res.status(400);
      throw new Error(error.message || 'Failed to create shop admin');
    }
  });

// @desc    Get all shop admins
// @route   GET /api/users/shop-admins
// @access  Private/Admin
const getShopAdmins = asyncHandler(async (req, res) => {
  const shopAdmins = await UserService.find({ role: 'shopAdmin' });
  res.json(shopAdmins);
});

// @desc    Get user wallet balance
// @route   GET /api/users/balance
// @access  Private
const getUserBalance = asyncHandler(async (req, res) => {
  try {
    // Debug: Log the user object to see its structure
    console.log('User object in getUserBalance:', req.user);
    
    // Check if user has id or _id field
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.error('No user ID found in req.user:', req.user);
      res.status(400);
      throw new Error('User ID not found in request');
    }
    
    const balance = await WalletService.getBalance(userId);
    
    res.json({
      success: true,
      balance: balance,
      currency: 'INR'
    });
  } catch (error) {
    console.error('Error getting user balance:', error);
    res.status(500);
    throw new Error('Failed to get balance');
  }
});

// @desc    Update user wallet balance
// @route   PUT /api/users/balance
// @access  Private
const updateUserBalance = asyncHandler(async (req, res) => {
  try {
    const { amount, type, reason } = req.body;

    // Debug: Log the user object to see its structure
    console.log('User object in updateUserBalance:', req.user);

    // Check if user has id or _id field
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.error('No user ID found in req.user:', req.user);
      res.status(400);
      throw new Error('User ID not found in request');
    }

    // Validate input
    if (!amount || amount <= 0) {
      res.status(400);
      throw new Error('Invalid amount');
    }

    if (!type || !['credit', 'debit'].includes(type)) {
      res.status(400);
      throw new Error('Invalid transaction type');
    }

    const result = await WalletService.updateBalance(
      userId, 
      amount, 
      type, 
      reason || 'Manual update'
    );

    res.json({
      success: true,
      balance: result.newBalance,
      previousBalance: result.previousBalance,
      transaction: result.transaction
    });
  } catch (error) {
    console.error('Error updating user balance:', error);
    res.status(500);
    throw new Error(error.message || 'Failed to update balance');
  }
});

// Create initial admin user if it doesn't exist
const createInitialAdmin = async () => {
  try {
    const users = await UserService.find({ role: 'admin' });
    const adminExists = users.length > 0;
    
    if (!adminExists) {
      await UserService.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        roll_no: 'ADMIN001',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
        is_verified: true,
      });
      console.log('Initial admin user created');
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
};

// Call this function when the server starts
createInitialAdmin();

export {
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
  createShopAdmin,
  getShopAdmins,
  getUserBalance,
  updateUserBalance,
};