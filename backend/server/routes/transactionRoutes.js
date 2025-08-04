import express from 'express';
import {
  getshopTransactionHistory,
  getshopTransactionStatistics,
  getTransactionDetails
} from '../controllers/transactionController.js';
import { protect, admin, shopAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/shop/:shop_id').get(protect, getshopTransactionHistory);
router.route('/shop/:shop_id/stats').get(protect, getshopTransactionStatistics);
router.route('/:id').get(protect, getTransactionDetails);

export default router;