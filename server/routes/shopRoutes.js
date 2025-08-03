import express from 'express';
import {
  getshops,
  getshopById,
  updateshop,
  deleteshop,
  getshopAnalytics,
  closeshop,
  toggleshopStatus,
  resetAllWallets,
} from '../controllers/shopController.js';
import { protect, admin, shopAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(getshops);
router.route('/reset-wallets').post(protect, admin, resetAllWallets);
router.route('/:id').get(getshopById).put(protect, updateshop).delete(protect, admin, deleteshop);
router.route('/:id/analytics').get(protect, getshopAnalytics);
router.route('/:id/close').post(protect, shopAdmin, closeshop);
router.route('/:id/toggle').post(protect, shopAdmin, toggleshopStatus);

export default router;