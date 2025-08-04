import { supabase } from '../config/supabase.js';

export const createSupabaseModel = (tableName) => {
  // Helper function to convert camelCase to snake_case for database columns
  const toSnakeCase = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => toSnakeCase(item));
    }
    
    const snakeObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Convert camelCase keys to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        snakeObj[snakeKey] = toSnakeCase(obj[key]);
      }
    }
    return snakeObj;
  };

  // Helper function to convert snake_case to camelCase for response objects
  const toCamelCase = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => toCamelCase(item));
    }
    
    const camelObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Convert snake_case keys to camelCase
        const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
        camelObj[camelKey] = toCamelCase(obj[key]);
      }
    }
    return camelObj;
  };

  return {
    async find(query = {}) {
      let queryBuilder = supabase.from(tableName).select('*');
      if (Object.keys(query).length > 0) {
        // Convert query keys to snake_case for database
        const snakeQuery = toSnakeCase(query);
        queryBuilder = queryBuilder.match(snakeQuery);
      }
      const { data, error } = await queryBuilder;
      if (error) {
        throw error;
      }
      // Convert response data to camelCase
      return toCamelCase(data);
    },
    async findOne(query = {}) {
      let queryBuilder = supabase.from(tableName).select('*').limit(1);
      if (Object.keys(query).length > 0) {
        // Convert query keys to snake_case for database
        const snakeQuery = toSnakeCase(query);
        queryBuilder = queryBuilder.match(snakeQuery);
      }
      const { data, error } = await queryBuilder;
      if (error) {
        throw error;
      }
      // Convert response data to camelCase
      return data && data.length > 0 ? toCamelCase(data[0]) : null;
    },

    async findById(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) {
        throw error;
      }
      // Convert response data to camelCase
      return toCamelCase(data);
    },
    async create(doc) {
      // Convert document keys to snake_case for database
      const snakeDoc = toSnakeCase(doc);
      const { data, error } = await supabase.from(tableName).insert(snakeDoc).select().single();
      if (error) {
        throw error;
      }
      // Convert response data to camelCase
      return toCamelCase(data);
    },
    async findByIdAndUpdate(id, update) {
      // Convert update keys to snake_case for database
      const snakeUpdate = toSnakeCase(update);
      const { data, error } = await supabase
        .from(tableName)
        .update(snakeUpdate)
        .eq('id', id)
        .single();
      if (error) {
        throw error;
      }
      // Convert response data to camelCase
      return toCamelCase(data);
    },
    async findByIdAndDelete(id) {
      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
        .single();
      if (error) {
        throw error;
      }
      // Convert response data to camelCase
      return toCamelCase(data);
    }
  };
};
