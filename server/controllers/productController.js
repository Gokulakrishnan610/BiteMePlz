import asyncHandler from 'express-async-handler';
import Product from '../models/productModel.js';
import Shop from '../models/shopModel.js';

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
  const { name, image, description, price, stock } = req.body;
  
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
    price,
    stock,
  });

  if (product) {
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

  product.name = req.body.name || product.name;
  product.description = req.body.description || product.description;
  product.image = req.body.image || product.image;
  product.price = req.body.price || product.price;
  product.stock = req.body.stock !== undefined ? req.body.stock : product.stock;
  product.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : product.isAvailable;

  const updatedProduct = await product.save();
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

  await product.deleteOne();
  res.json({ message: 'Product removed' });
});

export { getProducts, getProductById, createProduct, updateProduct, deleteProduct };