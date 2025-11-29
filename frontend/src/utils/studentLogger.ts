/**
 * Utility functions for logging student activities
 * These are client-side helpers that call the backend logging API
 */

import api from '../api'

interface LogActivityParams {
    action: string
    description?: string
    shopId?: string
    orderId?: string
    productId?: string
    metadata?: Record<string, any>
}

/**
 * Log a student activity
 * This is a fire-and-forget operation - errors are logged but don't affect the user experience
 */
export const logStudentActivity = async (params: LogActivityParams): Promise<void> => {
    try {
        // Only log if user is authenticated (token exists)
        const token = localStorage.getItem('token')
        if (!token) {
            return
        }

        // Check if user is a student or staff
        const userStr = localStorage.getItem('user')
        if (userStr) {
            const user = JSON.parse(userStr)
            if (!['student', 'staff'].includes(user.role)) {
                return // Only log for students and staff
            }
        }

        // Send log to backend (fire and forget - don't await)
        api.post('/api/student-logs/', {
            action: params.action,
            description: params.description,
            shop_id: params.shopId,
            order_id: params.orderId,
            product_id: params.productId,
            metadata: params.metadata || {},
        }).catch(() => {
            // Silently ignore errors
        })
    } catch (error) {
        // Silently fail - logging should never break the user experience
        console.debug('Failed to log student activity:', error)
    }
}

// Convenience functions for common actions
export const logLogout = () => 
    logStudentActivity({ 
        action: 'logout', 
        description: 'Logged out' 
    })

export const logViewShops = () => 
    logStudentActivity({ 
        action: 'view_shops', 
        description: 'Viewed shops page' 
    })

export const logViewProducts = (shopId: string, shopName: string) =>
    logStudentActivity({
        action: 'view_products',
        description: `Viewed products in ${shopName}`,
        shopId,
    })

export const logAddToCart = (productId: string, productName: string, shopId: string, quantity: number = 1) =>
    logStudentActivity({
        action: 'add_to_cart',
        description: `Added ${quantity}x ${productName} to cart`,
        shopId,
        productId,
        metadata: { quantity },
    })

export const logRemoveFromCart = (productId: string, productName: string, shopId?: string) =>
    logStudentActivity({
        action: 'remove_from_cart',
        description: `Removed ${productName} from cart`,
        shopId,
        productId,
    })

export const logViewOrder = (orderId: string, orderNumber: string, shopId?: string) =>
    logStudentActivity({
        action: 'view_order',
        description: `Viewed order #${orderNumber}`,
        shopId,
        orderId,
    })

export const logCancelOrder = (orderId: string, orderNumber: string, shopId?: string) =>
    logStudentActivity({
        action: 'cancel_order',
        description: `Cancelled order #${orderNumber}`,
        shopId,
        orderId,
    })

export const logAddBalance = (amount: number) =>
    logStudentActivity({
        action: 'add_balance',
        description: `Added ₹${amount} to wallet`,
        metadata: { amount },
    })

export const logViewProfile = () => 
    logStudentActivity({ 
        action: 'view_profile', 
        description: 'Viewed profile page' 
    })

export const logUpdateProfile = (updatedFields: string[]) =>
    logStudentActivity({
        action: 'update_profile',
        description: `Updated profile: ${updatedFields.join(', ')}`,
        metadata: { updated_fields: updatedFields },
    })

export const logViewTransactions = () =>
    logStudentActivity({ 
        action: 'view_transactions', 
        description: 'Viewed transaction history' 
    })
