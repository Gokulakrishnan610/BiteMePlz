import express from 'express';
import {
  getshopStudentAnalytics,
  getAdvancedStudentAnalytics,
  getOverallStudentAnalytics,
  trackActivity
} from '../controllers/studentAnalyticsController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/overview').get(protect, admin, getOverallStudentAnalytics);
router.route('/track').post(protect, trackActivity);
router.route('/shop/:shop_id').get(protect, getshopStudentAnalytics);
router.route('/shop/:shop_id/insights').get(protect, getAdvancedStudentAnalytics);

export default router;