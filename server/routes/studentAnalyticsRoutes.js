import express from 'express';
import {
  getShopStudentAnalytics,
  getAdvancedStudentAnalytics,
  getOverallStudentAnalytics,
  trackActivity
} from '../controllers/studentAnalyticsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/overview').get(protect, admin, getOverallStudentAnalytics);
router.route('/track').post(protect, trackActivity);
router.route('/shop/:shopId').get(protect, getShopStudentAnalytics);
router.route('/shop/:shopId/insights').get(protect, getAdvancedStudentAnalytics);

export default router;