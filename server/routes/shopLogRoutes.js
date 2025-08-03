import express from 'express';
import {
  getShopActivityLogs,
  getShopActivityStatistics,
  getAllShopLogs
} from '../controllers/shopLogController.js';
import { protect, admin, shopAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/all').get(protect, admin, getAllShopLogs);
router.route('/:shop_id').get(protect, getShopActivityLogs);
router.route('/:shop_id/stats').get(protect, getShopActivityStatistics);

export default router;