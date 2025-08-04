import express from 'express';
import {
  createOrder,
  updateOrderToPaid,
  verifyOrderQR,
  getOrderById,
  getMyOrders,
  getshopOrders,
  getOrderByPaymentId,
  continuePayment,
  cancelOrder,
  deleteOrder,
  checkExpiryAndRefund
} from '../controllers/orderController.js';
import { protect, shopAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, createOrder);

router.route('/myorders').get(protect, getMyOrders);
router.route('/shop/:shop_id').get(protect, getshopOrders);
router.route('/payment/:paymentId').get(protect, shopAdmin, getOrderByPaymentId);
router.route('/check-expiry/:order_id').get(protect, checkExpiryAndRefund);
router.route('/:id')
  .get(protect, getOrderById)
  .delete(protect, deleteOrder);
router.route('/:id/pay')
  .post(protect, continuePayment)
  .put(protect, updateOrderToPaid);
router.route('/:id/cancel').put(protect, cancelOrder);
router.route('/:id/verify').put(protect, shopAdmin, verifyOrderQR);

export default router;