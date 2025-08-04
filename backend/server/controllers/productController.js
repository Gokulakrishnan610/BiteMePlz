import asyncHandler from 'express-async-handler';
import { ProductService } from '../services/databaseService.js';
import { shopService } from '../services/databaseService.js';
import { logshopActivity } from '../utils/shopLogger.js';
import { supabase } from '../config/supabase.js';



// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const shop_id = req.query.shop;
  
  try {
    
    // Now try the actual query
    let query = {};
    if (shop_id) {
      query = { shop: shop_id, is_available: true };
    } else {
      query = { is_available: true };
    }
    
    // Check if the shop exists first
    if (shop_id) {
      const shop = await shopService.findById(shop_id);
      if (!shop) {
        return res.json([]);
      }
    }
    
    // Try the ProductService.find with better error handling
    const products = await ProductService.find(query);
    res.json(products);
    
  } catch (error) {
    console.error('[ProductController] Error fetching products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      details: error.message
    });
  }
});

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await ProductService.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/shopAdmin
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
  let shop_id;
  if (req.user.role === 'shopAdmin') {
    shop_id = req.user.shop;
  } else if (req.user.role === 'admin') {
    // If admin, use provided shop
    shop_id = req.body.shop;
    if (!shop_id) {
      res.status(400);
      throw new Error('shop ID is required for admin');
    }
    const shopExists = await shopService.findById(shop_id);
    if (!shopExists) {
      res.status(404);
      throw new Error('shop not found');
    }
  }
  const product = await ProductService.create({
    name,
    shop: shop_id,
    image: image || '/uploads/default-product.jpg',
    description,
    category: normalizedCategory,
    price,
    stock,
  });
  if (product) {
    // Log product creation
    await logshopActivity({
      shop: shop_id,
      action: 'product_created',
      performedBy: req.user.id || req.user._id,
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
// @access  Private/shopAdmin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.findById(req.params.id);
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
  const previousState = { ...product };
  // Update fields
  const updateData = {
    name: req.body.name || product.name,
    description: req.body.description || product.description,
    image: req.body.image || product.image,
    category: normalizedCategory,
    price: req.body.price !== undefined ? req.body.price : product.price,
    stock: req.body.stock !== undefined ? req.body.stock : product.stock,
    is_available: req.body.is_available !== undefined ? req.body.is_available : product.is_available,
  };
  
  const updatedProduct = await ProductService.findByIdAndUpdate(req.params.id, updateData);
  
  // Log product update
  await logshopActivity({
    shop: product.shop,
    action: 'product_updated',
    performedBy: req.user.id || req.user._id,
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
// @access  Private/shopAdmin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.findById(req.params.id);
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
  const previousState = { ...product };
  await ProductService.findByIdAndDelete(req.params.id);
  // Log product deletion
  await logshopActivity({
    shop: product.shop,
    action: 'product_deleted',
    performedBy: req.user.id || req.user._id,
    previousState,
    newState: { deleted: true },
    description: `Product "${product.name}" deleted by ${req.user.name}`,
    req,
    category: 'product'
  });
  res.json({ message: 'Product removed' });
});

export { getProducts, getProductById, createProduct, updateProduct, deleteProduct };