import { UserService } from '../services/databaseService.js';
import { logTransaction } from './transactionLogger.js';

/**
 * Wallet Service - Handles all wallet-related operations
 */
class WalletService {
  /**
   * Get user's current wallet balance
   * @param {string} userId - User ID
   * @returns {Promise<number>} Current balance
   */
  static async getBalance(userId) {
    try {
      const user = await UserService.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user.balance || 0;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw error;
    }
  }

  /**
   * Update user's wallet balance
   * @param {string} userId - User ID
   * @param {number} amount - Amount to add/subtract
   * @param {string} type - 'credit' or 'debit'
   * @param {string} reason - Reason for the transaction
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Updated balance info
   */
  static async updateBalance(userId, amount, type, reason = 'Manual update', metadata = {}) {
    try {
      // Validate inputs
      if (!amount || amount <= 0) {
        console.error(`[WalletService] Invalid amount:`, amount);
        throw new Error('Invalid amount');
      }

      if (!type || !['credit', 'debit'].includes(type)) {
        console.error(`[WalletService] Invalid transaction type:`, type);
        throw new Error('Invalid transaction type');
      }

      const user = await UserService.findById(userId);
      if (!user) {
        console.error(`[WalletService] User not found:`, userId);
        throw new Error('User not found');
      }

      // SCHEMA CHECK: Ensure balance column exists and is numeric
      if (typeof user.balance !== 'number') {
        console.error(`[WalletService] User balance column is missing or not numeric. Value:`, user.balance);
        throw new Error('User balance column is missing or not numeric. Please check your Supabase schema.');
      }

      const currentBalance = user.balance || 0;
      let newBalance;

      if (type === 'debit') {
        if (currentBalance < amount) {
          console.error(`[WalletService] Insufficient balance. Required: ₹${amount}, Available: ₹${currentBalance}`);
          throw new Error(`Insufficient balance. Required: ₹${amount}, Available: ₹${currentBalance}`);
        }
        newBalance = currentBalance - amount;
      } else {
        newBalance = currentBalance + amount;
      }

      // Update user's balance
      const updatedUser = await UserService.findByIdAndUpdate(userId, {
        balance: newBalance
      });
      if (!updatedUser) {
        console.error(`[WalletService] Failed to update user balance in DB for user:`, userId);
        throw new Error('Failed to update user balance in database.');
      }

      // Log the transaction
      await logTransaction({
        shop: metadata.shop || null,
        order: metadata.order || null,
        user: userId,
        type: 'wallet_update',
        amount: amount,
        paymentMethod: 'wallet',
        description: `Wallet ${type}: ${reason}`,
        metadata: {
          previousBalance: currentBalance,
          newBalance: newBalance,
          reason,
          ...metadata
        }
      });

      return {
        success: true,
        previousBalance: currentBalance,
        newBalance: newBalance,
        transaction: {
          type,
          amount,
          reason
        }
      };
    } catch (error) {
      console.error('[WalletService] Error updating wallet balance:', error);
      // Add more context to the error message for frontend
      throw new Error('[WalletService] Failed to update balance: ' + (error.message || error));
    }
  }

  /**
   * Process payment from wallet
   * @param {string} userId - User ID
   * @param {number} amount - Payment amount
   * @param {Object} orderData - Order information
   * @returns {Promise<Object>} Payment result
   */
  static async processPayment(userId, amount, orderData) {
    try {
      const currentBalance = await this.getBalance(userId);
      
      if (currentBalance < amount) {
        throw new Error(`Insufficient balance. Required: ₹${amount}, Available: ₹${currentBalance}`);
      }

      const result = await this.updateBalance(
        userId, 
        amount, 
        'debit', 
        'Order payment', 
        {
          orderId: orderData.orderId,
          shop_id: orderData.shop_id,
          shopName: orderData.shopName,
          order_items: orderData.order_items
        }
      );

      return {
        ...result,
        paymentMethod: 'balance',
        orderId: orderData.orderId
      };
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      throw error;
    }
  }

  /**
   * Process refund to wallet
   * @param {string} userId - User ID
   * @param {number} amount - Refund amount
   * @param {Object} refundData - Refund information
   * @returns {Promise<Object>} Refund result
   */
  static async processRefund(userId, amount, refundData) {
    try {
      const result = await this.updateBalance(
        userId, 
        amount, 
        'credit', 
        'Order refund', 
        {
          orderId: refundData.orderId,
          shop_id: refundData.shop_id,
          refundReason: refundData.reason || 'Order cancelled/expired',
          originalAmount: refundData.originalAmount
        }
      );

      return {
        ...result,
        refundAmount: amount,
        reason: refundData.reason || 'Order cancelled/expired'
      };
    } catch (error) {
      console.error('Error processing wallet refund:', error);
      throw error;
    }
  }

  /**
   * Check if user has sufficient balance
   * @param {string} userId - User ID
   * @param {number} amount - Required amount
   * @returns {Promise<boolean>} True if sufficient balance
   */
  static async hasSufficientBalance(userId, amount) {
    try {
      const balance = await this.getBalance(userId);
      return balance >= amount;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  }

  /**
   * Get wallet transaction history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Transaction history
   */
  static async getTransactionHistory(userId, options = {}) {
    try {
      // This would typically query the transaction log
      // For now, we'll return a placeholder
      return [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }
}

export default WalletService; 