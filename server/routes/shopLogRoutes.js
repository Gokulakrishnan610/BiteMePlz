import express from 'express';
import {
  getshopActivityLogs,
  getshopActivityStatistics,
  getAllshopLogs
} from '../controllers/shopLogController.js';
import { protect, admin, shopAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/all').get(protect, admin, getAllshopLogs);
router.route('/:shop_id').get(protect, getshopActivityLogs);
router.route('/:shop_id/stats').get(protect, getshopActivityStatistics);

export default router;