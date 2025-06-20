import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Shop from '../models/shopModel.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Register a new user and send OTP
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, rollNo, password } = req.body;

  const userExists = await User.findOne({ 
    $or: [{ email }, { rollNo }]
  });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

  const user = await User.create({
    name,
    email,
    rollNo,
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
        userId: user._id
      });
    } catch (error) {
      // If email fails to send, delete the user and throw error
      await user.deleteOne();
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

  const user = await User.findById(userId);

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

  user.isVerified = true;
  user.otp = undefined;
  await user.save();

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    rollNo: user.rollNo,
    role: user.role,
    token: generateToken(user._id),
  });
});

// @desc    Resend OTP
// @route   POST /api/users/resend-otp
// @access  Public
const resendOTP = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error('User is already verified');
  }

  const otp = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

  user.otp = {
    code: otp,
    expiresAt: otpExpiry
  };
  await user.save();

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

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isVerified) {
    res.status(401);
    throw new Error('Please verify your email first');
  }

  if (await user.matchPassword(password)) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      rollNo: user.rollNo,
      role: user.role,
      shop: user.shop,
      token: generateToken(user._id),
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
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      rollNo: user.rollNo,
      role: user.role,
      shop: user.shop,
      balance: user.balance,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.role === 'admin') {
      res.status(400);
      throw new Error('Cannot delete admin user');
    }

    // If user is a shop admin, handle shop deletion
    if (user.role === 'shopAdmin' && user.shop) {
      const shop = await Shop.findById(user.shop);
      if (shop) {
        await shop.deleteOne();
      }
    }

    await user.deleteOne();
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
  const userExists = await User.findOne({ email });

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
    createdUser = await User.create({
      name,
      email,
      rollNo,
      password,
      role: 'shopAdmin',
      isVerified: true, // Shop admin accounts are pre-verified
    });

    // Create shop with user reference
    createdShop = await Shop.create({
      name: shopName,
      description: shopDescription,
      location: shopLocation,
      image: shopImage || '/uploads/default-shop.jpg',
      isActive: true,
      isOpen: true,
      shopAdmin: createdUser._id,
      finalValidityTime: new Date(finalValidityTime),
      qrValidityMinutes: qrMinutes
    });

    // Update user with shop reference
    createdUser.shop = createdShop._id;
    await createdUser.save();

    res.status(201).json({
      _id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      rollNo: createdUser.rollNo,
      role: createdUser.role,
      shop: createdShop._id,
      token: generateToken(createdUser._id),
    });
  } catch (error) {
    // Clean up if any error occurs
    if (createdUser) {
      await User.findByIdAndDelete(createdUser._id);
    }
    if (createdShop) {
      await Shop.findByIdAndDelete(createdShop._id);
    }
    res.status(400);
    throw new Error(error.message || 'Failed to create shop admin');
  }
});

// @desc    Get all shop admins
// @route   GET /api/users/shop-admins
// @access  Private/Admin
const getShopAdmins = asyncHandler(async (req, res) => {
  const shopAdmins = await User.find({ role: 'shopAdmin' }).populate('shop');
  res.json(shopAdmins);
});

// @desc    Get user balance
// @route   GET /api/users/balance
// @access  Private
const getUserBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      balance: user.balance
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user balance
// @route   PUT /api/users/balance
// @access  Private
const updateUserBalance = asyncHandler(async (req, res) => {
  const { amount, type } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (type === 'debit' && user.balance < amount) {
    res.status(400);
    throw new Error('Insufficient balance');
  }

  user.balance = type === 'credit' 
    ? user.balance + amount 
    : user.balance - amount;

  await user.save();

  res.json({
    balance: user.balance
  });
});

// Create initial admin user if it doesn't exist
const createInitialAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        rollNo: 'ADMIN001',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
        isVerified: true,
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
  getUserProfile,
  getUsers,
  deleteUser,
  createShopAdmin,
  getShopAdmins,
  getUserBalance,
  updateUserBalance,
};