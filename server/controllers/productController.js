import asyncHandler from 'express-async-handler';
import { ProductService } from '../services/databaseService.js';
import { ShopService } from '../services/databaseService.js';
import { logShopActivity } from '../utils/shopLogger.js';
import { supabase } from '../config/supabase.js';

// @desc    Test products table structure
// @route   GET /api/products/debug
// @access  Public
const debugProductsTable = asyncHandler(async (req, res) => {
  console.log('[ProductController] Debug endpoint - checking products table');
  
  try {
    // Try to get a single product to test the table
    const { data, error } = await supabase.from('products').select('*').limit(1);
    
    if (error) {
      console.error('[ProductController] Table access error:', error);
      return res.json({
        error: 'Cannot access products table',
        details: error
      });
    }
    
    console.log('[ProductController] Table access successful');
    console.log('[ProductController] Sample data:', data);
    
    // Get table structure by looking at the first row
    const sampleRow = data && data.length > 0 ? data[0] : null;
    const columns = sampleRow ? Object.keys(sampleRow) : [];
    
    res.json({
      tableExists: true,
      sampleRow,
      columns,
      totalRows: data ? data.length : 0
    });
  } catch (error) {
    console.error('[ProductController] Debug error:', error);
    res.status(500).json({
      error: 'Debug failed',
      details: error.message
    });
  }
});

// @desc    Get all products (test endpoint)
// @route   GET /api/products/test
// @access  Public
const getAllProducts = asyncHandler(async (req, res) => {
  console.log('[ProductController] Test endpoint - getting all products');
  
  try {
    const products = await ProductService.find({});
    console.log('[ProductController] All products found:', products.length);
    console.log('[ProductController] All products data:', products);
    res.json({
      count: products.length,
      products: products
    });
  } catch (error) {
    console.error('[ProductController] Error in test endpoint:', error);
    res.status(500);
    throw new Error('Failed to fetch all products');
  }
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const shopId = req.query.shop;
  
  console.log('[ProductController] Fetching products with shop ID:', shopId);
  console.log('[ProductController] Shop ID type:', typeof shopId);
  
  try {
    // First, let's try a simple query without filters to see if the table works
    console.log('[ProductController] Testing basic table access...');
    const { data: testData, error: testError } = await supabase.from('products').select('*').limit(1);
    
    if (testError) {
      console.error('[ProductController] Basic table access failed:', testError);
      return res.status(500).json({
        error: 'Database connection issue',
        details: testError
      });
    }
    
    console.log('[ProductController] Basic table access successful');
    
    // Now try the actual query
    let query = {};
    if (shopId) {
      query = { shop: shopId, isAvailable: true };
      console.log('[ProductController] Using shop-specific query:', query);
    } else {
      query = { isAvailable: true };
      console.log('[ProductController] Using general query (no shop filter):', query);
    }
    
    // Check if the shop exists first
    if (shopId) {
      const shop = await ShopService.findById(shopId);
      console.log('[ProductController] Shop lookup result:', shop ? 'Found' : 'Not found');
      if (!shop) {
        console.log('[ProductController] Shop not found, returning empty array');
        return res.json([]);
      }
    }
    
    // Try the ProductService.find with better error handling
    console.log('[ProductController] Calling ProductService.find with query:', query);
    const products = await ProductService.find(query);
    console.log('[ProductController] Found products:', products.length);
    console.log('[ProductController] Products data:', products);
    res.json(products);
    
  } catch (error) {
    console.error('[ProductController] Error fetching products:', error);
    console.error('[ProductController] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    
    // Return a more specific error message
    res.status(500).json({
      error: 'Failed to fetch products',
      details: error.message,
      shopId: shopId
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
    const shopExists = await ShopService.findById(shopId);
    if (!shopExists) {
      res.status(404);
      throw new Error('Shop not found');
    }
  }
  const product = await ProductService.create({
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
// @access  Private/ShopAdmin
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
    isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : product.isAvailable,
  };
  
  const updatedProduct = await ProductService.findByIdAndUpdate(req.params.id, updateData);
  
  // Log product update
  await logShopActivity({
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
// @access  Private/ShopAdmin
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
  await logShopActivity({
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

export { debugProductsTable, getAllProducts, getProducts, getProductById, createProduct, updateProduct, deleteProduct };