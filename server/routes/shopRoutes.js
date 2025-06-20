import express from 'express';
import {
  getShops,
  getShopById,
  updateShop,
  deleteShop,
  getShopAnalytics,
  closeShop,
  toggleShopStatus,
  resetAllWallets,
} from '../controllers/shopController.js';
import { protect, admin, shopAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(getShops);
router.route('/reset-wallets').post(protect, admin, resetAllWallets);
router.route('/:id').get(getShopById).put(protect, updateShop).delete(protect, admin, deleteShop);
router.route('/:id/analytics').get(protect, getShopAnalytics);
router.route('/:id/close').post(protect, shopAdmin, closeShop);
router.route('/:id/toggle').post(protect, shopAdmin, toggleShopStatus);

export default router;