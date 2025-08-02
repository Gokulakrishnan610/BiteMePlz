import asyncHandler from 'express-async-handler';
import Product from '../models/productModel.js';
import Shop from '../models/shopModel.js';
import { logShopActivity } from '../utils/shopLogger.js';

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const shopId = req.query.shop;
  const query = shopId ? { shop: shopId, isAvailable: true } : { isAvailable: true };
  
  const products = await Product.find(query);
  res.json(products);
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/ShopAdmin
const createProduct = asyncHandler(async (req, res) => {
  const { name, image, description, price, stock, category } = req.body;
  // Validate category
  const validCategories = ['food', 'beverages', 'snacks', 'stationery', 'electronics', 'others'];
  const normalizedCategory = category ? category.toLowerCase().trim() : 'others';
  if (!validCategories.includes(normalizedCategory)) {
    res.status(400);
    throw new Error('Invalid category provided');
  }
  // If shop admin, use their shop
  let shopId;
  if (req.user.role === 'shopAdmin') {
    shopId = req.user.shop;
  } else if (req.user.role === 'admin') {
    // If admin, use provided shop
    shopId = req.body.shop;
    if (!shopId) {
      res.status(400);
      throw new Error('Shop ID is required for admin');
    }
    const shopExists = await Shop.findById(shopId);
    if (!shopExists) {
      res.status(404);
      throw new Error('Shop not found');
    }
  }
  const product = await Product.create({
    name,
    shop: shopId,
    image: image || '/uploads/default-product.jpg',
    description,
    category: normalizedCategory,
    price,
    stock,
  });
  if (product) {
    // Log product creation
    await logShopActivity({
      shop: shopId,
      action: 'product_created',
      performedBy: req.user._id,
      newState: product,
      description: `Product "${name}" created in shop by ${req.user.name}`,
      req,
      category: 'product'
    });
    res.status(201).json(product);
  } else {
    res.status(400);
    throw new Error('Invalid product data');
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/ShopAdmin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  // Check if user is admin or the shop admin of this product's shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || product.shop.toString() !== req.user.shop.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }
  // Validate category if provided
  let normalizedCategory = product.category; // Keep existing category as default
  if (req.body.category !== undefined) {
    const validCategories = ['food', 'beverages', 'snacks', 'stationery', 'electronics', 'others'];
    normalizedCategory = req.body.category.toLowerCase().trim();
    if (!validCategories.includes(normalizedCategory)) {
      res.status(400);
      throw new Error('Invalid category provided');
    }
  }
  // Store previous state for logging
  const previousState = { ...product.toObject() };
  // Update fields
  product.name = req.body.name || product.name;
  product.description = req.body.description || product.description;
  product.image = req.body.image || product.image;
  product.category = normalizedCategory;
  product.price = req.body.price !== undefined ? req.body.price : product.price;
  product.stock = req.body.stock !== undefined ? req.body.stock : product.stock;
  product.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : product.isAvailable;
  const updatedProduct = await product.save();
  // Log product update
  await logShopActivity({
    shop: product.shop,
    action: 'product_updated',
    performedBy: req.user._id,
    previousState,
    newState: updatedProduct,
    description: `Product "${updatedProduct.name}" updated by ${req.user.name}`,
    req,
    category: 'product'
  });
  res.json(updatedProduct);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/ShopAdmin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  // Check if user is admin or the shop admin of this product's shop
  if (
    req.user.role !== 'admin' && 
    (req.user.role !== 'shopAdmin' || product.shop.toString() !== req.user.shop.toString())
  ) {
    res.status(401);
    throw new Error('Not authorized');
  }
  const previousState = { ...product.toObject() };
  await product.deleteOne();
  // Log product deletion
  await logShopActivity({
    shop: product.shop,
    action: 'product_deleted',
    performedBy: req.user._id,
    previousState,
    newState: { deleted: true },
    description: `Product "${product.name}" deleted by ${req.user.name}`,
    req,
    category: 'product'
  });
  res.json({ message: 'Product removed' });
});

export { getProducts, getProductById, createProduct, updateProduct, deleteProduct };