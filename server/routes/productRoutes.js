import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect, shopAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(getProducts).post(protect, shopAdmin, createProduct);
router.route('/:id').get(getProductById).put(protect, shopAdmin, updateProduct).delete(protect, shopAdmin, deleteProduct);

export default router;