import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

// Helper function to handle Supabase errors
const handleSupabaseError = (error, operation) => {
  console.error(`Database ${operation} error:`, error);
  throw new Error(`Database ${operation} failed: ${error.message}`);
};

// Helper function to convert Supabase data to match Mongoose format
const formatResponse = (data, includeTimestamps = true) => {
  if (!data) return null;
  
  const formatted = { ...data };
  
  // Convert Supabase id to _id to match Mongoose format
  if (formatted.id) {
    formatted._id = formatted.id;
    // Keep the original id as well for backward compatibility
  }
  
  // Convert Supabase timestamps to match Mongoose format
  if (includeTimestamps) {
    if (formatted.created_at) {
      formatted.createdAt = formatted.created_at;
      delete formatted.created_at;
    }
    if (formatted.updated_at) {
      formatted.updatedAt = formatted.updated_at;
      delete formatted.updated_at;
    }
  }
  
  return formatted;
};

// User Service
export const UserService = {
  // Create a new user
  async create(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'create user');
    }
  },

  // Find user by ID
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        // Handle "not found" case gracefully
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      return formatResponse(data);
    } catch (error) {
      // Handle other errors
      if (error.code === 'PGRST116') {
        return null;
      }
      handleSupabaseError(error, 'find user by id');
    }
  },

  // Find user by email
  async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .limit(1);
      
      if (error) throw error;
      return data && data.length > 0 ? formatResponse(data[0]) : null;
    } catch (error) {
      handleSupabaseError(error, 'find user by email');
    }
  },

  // Find user by roll number
  async findByRollNo(rollNo) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('roll_no', rollNo)
        .limit(1);
      
      if (error) throw error;
      return data && data.length > 0 ? formatResponse(data[0]) : null;
    } catch (error) {
      handleSupabaseError(error, 'find user by roll number');
    }
  },

  // Update user
  async findByIdAndUpdate(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'update user');
    }
  },

  // Find all users
  async find(filter = {}) {
    try {
      let query = supabase.from('users').select('*');
      
      // Apply filters
      Object.keys(filter).forEach(key => {
        query = query.eq(key, filter[key]);
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(item => formatResponse(item));
    } catch (error) {
      handleSupabaseError(error, 'find users');
    }
  },

  // Delete user
  async findByIdAndDelete(id) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      handleSupabaseError(error, 'delete user');
    }
  }
};

// Shop Service
export const ShopService = {
  // Create a new shop
  async create(shopData) {
    try {
      const { data, error } = await supabase
        .from('shops')
        .insert([shopData])
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'create shop');
    }
  },

  // Find shop by ID
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'find shop by id');
    }
  },

  // Find all shops
  async find(filter = {}) {
    try {
      let query = supabase.from('shops').select('*');
      
      // Apply filters
      Object.keys(filter).forEach(key => {
        query = query.eq(key, filter[key]);
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(item => formatResponse(item));
    } catch (error) {
      handleSupabaseError(error, 'find shops');
    }
  },

  // Update shop
  async findByIdAndUpdate(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'update shop');
    }
  },

  // Delete shop
  async findByIdAndDelete(id) {
    try {
      const { error } = await supabase
        .from('shops')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      handleSupabaseError(error, 'delete shop');
    }
  }
};

// Product Service
export const ProductService = {
  // Create a new product
  async create(productData) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'create product');
    }
  },

  // Find product by ID
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'find product by id');
    }
  },

  // Find all products
  async find(filter = {}) {
    try {
      console.log('[ProductService] Finding products with filter:', filter);
      console.log('[ProductService] Filter keys:', Object.keys(filter));
      
      let query = supabase.from('products').select('*');
      
      // Apply filters
      Object.keys(filter).forEach(key => {
        const value = filter[key];
        console.log(`[ProductService] Applying filter: ${key} = ${value} (type: ${typeof value})`);
        
        // Handle different data types properly
        if (typeof value === 'boolean') {
          query = query.eq(key, value);
        } else if (typeof value === 'string') {
          // For UUID strings, make sure we're comparing correctly
          query = query.eq(key, value);
        } else {
          query = query.eq(key, value);
        }
      });
      
      console.log('[ProductService] Executing Supabase query...');
      const { data, error } = await query;
      
      if (error) {
        console.error('[ProductService] Supabase error:', error);
        console.error('[ProductService] Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        // Return empty array instead of throwing
        console.log('[ProductService] Returning empty array due to error');
        return [];
      }
      
      console.log('[ProductService] Raw Supabase data:', data);
      console.log('[ProductService] Raw data length:', data ? data.length : 0);
      
      const formattedData = data ? data.map(item => formatResponse(item)) : [];
      console.log('[ProductService] Formatted data length:', formattedData.length);
      console.log('[ProductService] Formatted data:', formattedData);
      
      return formattedData;
    } catch (error) {
      console.error('[ProductService] Error in find:', error);
      console.error('[ProductService] Full error object:', error);
      // Return empty array instead of throwing
      console.log('[ProductService] Returning empty array due to exception');
      return [];
    }
  },

  // Update product
  async findByIdAndUpdate(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'update product');
    }
  },

  // Delete product
  async findByIdAndDelete(id) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      handleSupabaseError(error, 'delete product');
    }
  }
};

// Order Service
export const OrderService = {
  // Create a new order
  async create(orderData) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'create order');
    }
  },

  // Find order by ID
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'find order by id');
    }
  },

  // Find order by order ID
  async findByOrderId(orderId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'find order by order id');
    }
  },

  // Find all orders
  async find(filter = {}) {
    try {
      let query = supabase.from('orders').select('*');
      
      // Apply filters
      Object.keys(filter).forEach(key => {
        query = query.eq(key, filter[key]);
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(item => formatResponse(item));
    } catch (error) {
      handleSupabaseError(error, 'find orders');
    }
  },

  // Update order
  async findByIdAndUpdate(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'update order');
    }
  },

  // Delete order
  async findByIdAndDelete(id) {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      handleSupabaseError(error, 'delete order');
    }
  },

  // Generate order ID (static method equivalent)
  async generateOrderId(shopName) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const baseOrderId = `${shopName.substring(0, 3).toUpperCase()}${day}${month}${year}`;
    
    // Find the last order with this base ID
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('order_id')
      .ilike('order_id', `${baseOrderId}%`)
      .order('order_id', { ascending: false })
      .limit(1)
      .single();

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.order_id.slice(-3));
      sequence = lastSequence + 1;
    }

    const sequenceStr = String(sequence).padStart(3, '0');
    return `${baseOrderId}${sequenceStr}`;
  }
};

// Transaction Service
export const TransactionService = {
  // Create a new transaction
  async create(transactionData) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'create transaction');
    }
  },

  // Find transaction by ID
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'find transaction by id');
    }
  },

  // Find all transactions
  async find(filter = {}) {
    try {
      let query = supabase.from('transactions').select('*');
      
      // Apply filters
      Object.keys(filter).forEach(key => {
        query = query.eq(key, filter[key]);
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(item => formatResponse(item));
    } catch (error) {
      handleSupabaseError(error, 'find transactions');
    }
  },

  // Update transaction
  async findByIdAndUpdate(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'update transaction');
    }
  }
};

// Shop Log Service
export const ShopLogService = {
  // Create a new shop log
  async create(logData) {
    try {
      const { data, error } = await supabase
        .from('shop_logs')
        .insert([logData])
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'create shop log');
    }
  },

  // Find all shop logs
  async find(filter = {}) {
    try {
      let query = supabase.from('shop_logs').select('*');
      
      // Apply filters
      Object.keys(filter).forEach(key => {
        query = query.eq(key, filter[key]);
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(item => formatResponse(item));
    } catch (error) {
      handleSupabaseError(error, 'find shop logs');
    }
  }
};

// Student Analytics Service
export const StudentAnalyticsService = {
  // Create a new analytics record
  async create(analyticsData) {
    try {
      const { data, error } = await supabase
        .from('student_analytics')
        .insert([analyticsData])
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'create student analytics');
    }
  },

  // Find analytics by ID
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('student_analytics')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'find student analytics by id');
    }
  },

  // Find all analytics
  async find(filter = {}) {
    try {
      let query = supabase.from('student_analytics').select('*');
      
      // Apply filters
      Object.keys(filter).forEach(key => {
        query = query.eq(key, filter[key]);
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(item => formatResponse(item));
    } catch (error) {
      handleSupabaseError(error, 'find student analytics');
    }
  },

  // Update analytics
  async findByIdAndUpdate(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('student_analytics')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return formatResponse(data);
    } catch (error) {
      handleSupabaseError(error, 'update student analytics');
    }
  }
}; 