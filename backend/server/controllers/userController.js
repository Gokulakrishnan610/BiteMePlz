import asyncHandler from 'express-async-handler';
import { UserService } from '../services/databaseService.js';
import { shopService } from '../services/databaseService.js';
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

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await UserService.create({
    name,
    email,
    roll_no: rollNo,
    password: hashedPassword,
    otp: {
      code: otp,
      expires_at: otpExpiry
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

  if (!user.otp || !user.otp.code || !user.otp.expires_at) {
    res.status(400);
    throw new Error('OTP not found or expired');
  }

  if (new Date() > user.otp.expires_at) {
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
      expires_at: otpExpiry
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
      expires_at: otpExpiry
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

  if (!user.password_reset_otp || !user.password_reset_otp.code || !user.password_reset_otp.expires_at) {
    res.status(400);
    throw new Error('Password reset OTP not found or expired');
  }

  if (new Date() > user.password_reset_otp.expires_at) {
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
      expires_at: resetTokenExpiry
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

  if (!user.password_reset_token || !user.password_reset_token.token || !user.password_reset_token.expires_at) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  if (new Date() > user.password_reset_token.expires_at) {
    res.status(400);
    throw new Error('Reset token has expired');
  }

  if (user.password_reset_token.token !== resetToken) {
    res.status(400);
    throw new Error('Invalid reset token');
  }

  // Reset the password
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  await UserService.findByIdAndUpdate(user.id, {
    password: hashedNewPassword,
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
      expires_at: otpExpiry
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

  console.log('Login attempt for email:', email);

  const user = await UserService.findByEmail(email);

  if (!user) {
    console.log('User not found for email:', email);
    res.status(401);
    throw new Error('Invalid email or password');
  }

  console.log('User found:', { id: user.id, email: user.email, role: user.role, isVerified: user.is_verified });

  if (!user.is_verified) {
    console.log('User not verified:', email);
    res.status(401);
    throw new Error('Please verify your email first');
  }

  // Compare password using bcrypt
  console.log('Comparing passwords...');
  const isPasswordValid = await bcrypt.compare(password, user.password);
  console.log('Password comparison result:', isPasswordValid);
  
  if (isPasswordValid) {
    console.log('Login successful for:', email);
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      rollNo: user.roll_no,
      role: user.role,
      shop: user.shop,
      is_sub_admin: user.is_sub_admin,
      parent_admin: user.parent_admin,
      token: generateToken(user.id),
    });
  } else {
    console.log('Invalid password for:', email);
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
      shop = await shopService.findById(user.shop);
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
    is_sub_admin: user.is_sub_admin,
    parent_admin: user.parent_admin,
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
      const shop = await shopService.findById(user.shop);
      if (shop) {
        await shopService.findByIdAndDelete(shop.id);
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
  const createshopAdmin = asyncHandler(async (req, res) => {
    const { 
      name, 
      email, 
      password, 
      shopName, 
      shopDescription, 
      shopLocation, 
      shopImage,
      final_validity_time,
      qrValidityMinutes
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !shopName || !shopDescription || !shopLocation) {
      res.status(400);
      throw new Error('Please fill in all required fields');
    }

    // Validate final_validity_time
    if (!final_validity_time) {
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
    const rollNo = `shop${Date.now().toString().slice(-6)}`;

    let createdUser = null;
    let createdshop = null;

    try {
      // Create user first
      const hashedPassword = await bcrypt.hash(password, 10);
      createdUser = await UserService.create({
        name,
        email,
        roll_no: rollNo,
        password: hashedPassword,
        role: 'shopAdmin',
        is_verified: true, // shop admin accounts are pre-verified
      });

      // Create shop with user reference
      createdshop = await shopService.create({
        name: shopName,
        description: shopDescription,
        location: shopLocation,
        image: shopImage || '/uploads/default-shop.jpg',
        is_active: true,
        is_open: true,
        shop_admin: createdUser.id,
        final_validity_time: new Date(final_validity_time),
        next_opening_time: new Date(final_validity_time), // Set next opening time to final validity time
        qr_validity_minutes: qrMinutes
      });

      // Update user with shop reference
      await UserService.findByIdAndUpdate(createdUser.id, {
        shop: createdshop.id
      });

      res.status(201).json({
        _id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        rollNo: createdUser.roll_no,
        role: createdUser.role,
        shop: createdshop.id,
        token: generateToken(createdUser.id),
      });
    } catch (error) {
      // Clean up if any error occurs
      if (createdUser) {
        await UserService.findByIdAndDelete(createdUser.id);
      }
      if (createdshop) {
        await shopService.findByIdAndDelete(createdshop.id);
      }
      res.status(400);
      throw new Error(error.message || 'Failed to create shop admin');
    }
  });

// @desc    Create a sub-shop admin for existing shop
// @route   POST /api/users/sub-shop-admin
// @access  Private/ShopAdmin
const createSubShopAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  // Check if current user is a shop admin and not a sub-admin
  if (req.user.role !== 'shopAdmin' || req.user.is_sub_admin) {
    res.status(403);
    throw new Error('Only original shop admins can create sub-shop admins');
  }

  // Get the shop admin's shop
  const shopAdmin = await UserService.findById(req.user.id || req.user._id);
  if (!shopAdmin || !shopAdmin.shop) {
    res.status(400);
    throw new Error('Shop admin not found or not associated with a shop');
  }

  // Verify the shop exists
  const shop = await shopService.findById(shopAdmin.shop);
  if (!shop) {
    res.status(400);
    throw new Error('Shop not found');
  }

  // Check if user already exists
  const userExists = await UserService.findByEmail(email);
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Generate a unique roll number for sub-shop admin
  const rollNo = `subshop${Date.now().toString().slice(-6)}`;

  try {
    // Create sub-shop admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    const subShopAdmin = await UserService.create({
      name,
      email,
      roll_no: rollNo,
      password: hashedPassword,
      role: 'shopAdmin',
      is_verified: true,
      shop: shopAdmin.shop, // Associate with the same shop
      is_sub_admin: true, // Mark as sub-admin
      parent_admin: shopAdmin.id // Reference to parent admin
    });

    res.status(201).json({
      _id: subShopAdmin.id,
      name: subShopAdmin.name,
      email: subShopAdmin.email,
      rollNo: subShopAdmin.roll_no,
      role: subShopAdmin.role,
      shop: subShopAdmin.shop,
      is_sub_admin: true,
      parent_admin: subShopAdmin.parent_admin,
      message: 'Sub-shop admin created successfully'
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || 'Failed to create sub-shop admin');
  }
});

// @desc    Get all sub-shop admins for a shop
// @route   GET /api/users/sub-shop-admins
// @access  Private/ShopAdmin
const getSubShopAdmins = asyncHandler(async (req, res) => {
  // Check if current user is a shop admin and not a sub-admin
  if (req.user.role !== 'shopAdmin' || req.user.is_sub_admin) {
    res.status(403);
    throw new Error('Only original shop admins can view sub-shop admins');
  }

  const shopAdmin = await UserService.findById(req.user.id || req.user._id);
  if (!shopAdmin || !shopAdmin.shop) {
    res.status(400);
    throw new Error('Shop admin not found or not associated with a shop');
  }

  // Get all sub-shop admins for this shop
  const subShopAdmins = await UserService.find({
    shop: shopAdmin.shop,
    is_sub_admin: true
  });

  res.json(subShopAdmins);
});

// @desc    Delete a sub-shop admin
// @route   DELETE /api/users/sub-shop-admin/:id
// @access  Private/ShopAdmin
const deleteSubShopAdmin = asyncHandler(async (req, res) => {
  const subAdminId = req.params.id;

  // Check if current user is a shop admin and not a sub-admin
  if (req.user.role !== 'shopAdmin' || req.user.is_sub_admin) {
    res.status(403);
    throw new Error('Only original shop admins can delete sub-shop admins');
  }

  const shopAdmin = await UserService.findById(req.user.id || req.user._id);
  if (!shopAdmin || !shopAdmin.shop) {
    res.status(400);
    throw new Error('Shop admin not found or not associated with a shop');
  }

  // Find the sub-shop admin
  const subShopAdmin = await UserService.findById(subAdminId);
  if (!subShopAdmin) {
    res.status(404);
    throw new Error('Sub-shop admin not found');
  }

  // Verify the sub-shop admin belongs to the same shop
  if (subShopAdmin.shop.toString() !== shopAdmin.shop.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this sub-shop admin');
  }

  // Verify it's actually a sub-admin
  if (!subShopAdmin.is_sub_admin) {
    res.status(400);
    throw new Error('User is not a sub-shop admin');
  }

  // Delete the sub-shop admin
  await UserService.findByIdAndDelete(subAdminId);

  res.json({ message: 'Sub-shop admin deleted successfully' });
});

// @desc    Get all shop admins
// @route   GET /api/users/shop-admins
// @access  Private/Admin
const getshopAdmins = asyncHandler(async (req, res) => {
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
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await UserService.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        roll_no: 'ADMIN001',
        password: hashedPassword,
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
  createshopAdmin,
  getshopAdmins,
  createSubShopAdmin,
  getSubShopAdmins,
  deleteSubShopAdmin,
  getUserBalance,
  updateUserBalance,
};