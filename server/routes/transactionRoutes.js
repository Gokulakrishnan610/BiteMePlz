import express from 'express';
import {
  getShopTransactionHistory,
  getShopTransactionStatistics,
  getTransactionDetails
} from '../controllers/transactionController.js';
import { protect, admin, shopAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/shop/:shopId').get(protect, getShopTransactionHistory);
router.route('/shop/:shopId/stats').get(protect, getShopTransactionStatistics);
router.route('/:id').get(protect, getTransactionDetails);

export default router;