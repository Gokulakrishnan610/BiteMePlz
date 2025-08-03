import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

const resetDatabase = async () => {
  try {
    console.log('🔄 Starting database reset...');

    // 1. Clear all data from all tables
    console.log('🗑️ Clearing all data...');
    
    // Delete in order to respect foreign key constraints
    const tablesToClear = [
      'transactions',
      'orders', 
      'products',
      'shop_logs',
      'student_analytics',
      'shops',
      'users'
    ];

    for (const table of tablesToClear) {
      try {
        // Use a more aggressive delete approach
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
          console.error(`❌ Error clearing ${table}:`, error);
          // Try alternative approach for foreign key issues
          if (error.code === '23503') {
            console.log(`🔄 Trying alternative approach for ${table}...`);
            // For shops and users, we need to handle foreign keys
            if (table === 'shops') {
              // First update users to remove shop references
              await supabase.from('users').update({ shop: null }).not('shop', 'is', null);
              // Then delete shops
              await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            } else if (table === 'users') {
              // First update shops to remove admin references
              await supabase.from('shops').update({ shop_admin: null }).not('shop_admin', 'is', null);
              // Then delete users
              await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            }
          }
        } else {
          console.log(`✅ Cleared ${table} table`);
        }
      } catch (error) {
        console.error(`❌ Error clearing ${table}:`, error);
      }
    }

    console.log('✅ Database cleared successfully');

    // 2. Check if admin user already exists
    console.log('👑 Checking for existing admin user...');
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@example.com')
      .single();

    if (existingAdmin) {
      console.log('✅ Admin user already exists, updating password...');
      const adminPassword = await bcrypt.hash('admin123', 10);
      await supabase.from('users').update({ password: adminPassword }).eq('email', 'admin@example.com');
      console.log('✅ Admin password updated');
    } else {
      console.log('👑 Creating admin user...');
      const adminPassword = await bcrypt.hash('admin123', 10);
      const adminUser = await supabase.from('users').insert([{
        name: 'Admin',
        email: 'admin@example.com',
        roll_no: 'ADMIN001',
        password: adminPassword,
        role: 'admin',
        is_verified: true,
        balance: 0
      }]).select().single();

      if (adminUser.error) {
        console.error('❌ Error creating admin:', adminUser.error);
      } else {
        console.log('✅ Admin user created:', adminUser.data.email);
      }
    }

    // 3. Check if shop admin user already exists
    console.log('🏪 Checking for existing shop admin user...');
    const { data: existingShopAdmin } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'shopadmin@example.com')
      .single();

    if (existingShopAdmin) {
      console.log('✅ Shop admin user already exists, updating password...');
      const shopAdminPassword = await bcrypt.hash('shopadmin123', 10);
      await supabase.from('users').update({ password: shopAdminPassword }).eq('email', 'shopadmin@example.com');
      console.log('✅ Shop admin password updated');
    } else {
      console.log('🏪 Creating shop admin user...');
      const shopAdminPassword = await bcrypt.hash('shopadmin123', 10);
      const shopAdminUser = await supabase.from('users').insert([{
        name: 'Shop Admin',
        email: 'shopadmin@example.com',
        roll_no: 'SHOPADMIN001',
        password: shopAdminPassword,
        role: 'shopAdmin',
        is_verified: true,
        balance: 0
      }]).select().single();

      if (shopAdminUser.error) {
        console.error('❌ Error creating shop admin:', shopAdminUser.error);
      } else {
        console.log('✅ Shop admin user created:', shopAdminUser.data.email);
      }
    }

    // 4. Get or create shop admin user for shop creation
    const { data: shopAdminUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'shopadmin@example.com')
      .single();

    if (!shopAdminUser) {
      console.error('❌ Shop admin user not found, cannot create shop');
      return;
    }

    // 5. Check if shop already exists
    console.log('🏪 Checking for existing shop...');
    const { data: existingShop } = await supabase
      .from('shops')
      .select('*')
      .eq('shop_admin', shopAdminUser.id)
      .single();

    if (existingShop) {
      console.log('✅ Shop already exists for shop admin');
    } else {
      console.log('🏪 Creating shop...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);

      const shop = await supabase.from('shops').insert([{
        name: 'Test Shop',
        description: 'A test shop for demonstration',
        location: 'Test Location',
        image: '/uploads/default-shop.jpg',
        shop_admin: shopAdminUser.id,
        is_active: true,
        is_open: true,
        final_validity_time: tomorrow.toISOString(),
        next_opening_time: tomorrow.toISOString(),
        qr_validity_minutes: 20
      }]).select().single();

      if (shop.error) {
        console.error('❌ Error creating shop:', shop.error);
      } else {
        console.log('✅ Shop created:', shop.data.name);
      }

      // 6. Update shop admin with shop reference
      if (shop.data) {
        await supabase.from('users').update({ shop: shop.data.id }).eq('id', shopAdminUser.id);
        console.log('✅ Shop admin updated with shop reference');
      }
    }

    // 7. Create test student users (only if they don't exist)
    console.log('👨‍🎓 Checking for existing student users...');
    const studentPasswords = ['student123', 'student456', 'student789'];
    const students = [
      { name: 'John Student', email: 'john@student.com', roll_no: 'STU001' },
      { name: 'Jane Student', email: 'jane@student.com', roll_no: 'STU002' },
      { name: 'Bob Student', email: 'bob@student.com', roll_no: 'STU003' }
    ];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const { data: existingStudent } = await supabase
        .from('users')
        .select('*')
        .eq('email', student.email)
        .single();

      if (existingStudent) {
        console.log(`✅ Student ${student.email} already exists, updating password...`);
        const password = await bcrypt.hash(studentPasswords[i], 10);
        await supabase.from('users').update({ 
          password: password,
          balance: 100 
        }).eq('email', student.email);
      } else {
        console.log(`👨‍🎓 Creating student ${student.email}...`);
        const password = await bcrypt.hash(studentPasswords[i], 10);
        
        const studentUser = await supabase.from('users').insert([{
          name: student.name,
          email: student.email,
          roll_no: student.roll_no,
          password: password,
          role: 'student',
          is_verified: true,
          balance: 100
        }]).select().single();

        if (studentUser.error) {
          console.error(`❌ Error creating student ${student.name}:`, studentUser.error);
        } else {
          console.log(`✅ Student created: ${student.email} (password: ${studentPasswords[i]})`);
        }
      }
    }

    // 8. Create test products (only if shop exists)
    const { data: shop } = await supabase
      .from('shops')
      .select('*')
      .eq('shop_admin', shopAdminUser.id)
      .single();

    if (shop) {
      console.log('📦 Creating test products...');
      const products = [
        {
          name: 'Coffee',
          description: 'Hot coffee',
          category: 'beverages',
          price: 25,
          stock: 50,
          image: '/uploads/default-product.jpg',
          shop: shop.id,
          is_available: true
        },
        {
          name: 'Sandwich',
          description: 'Fresh sandwich',
          category: 'food',
          price: 60,
          stock: 30,
          image: '/uploads/default-product.jpg',
          shop: shop.id,
          is_available: true
        },
        {
          name: 'Chips',
          description: 'Potato chips',
          category: 'snacks',
          price: 20,
          stock: 100,
          image: '/uploads/default-product.jpg',
          shop: shop.id,
          is_available: true
        }
      ];

      for (const product of products) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('*')
          .eq('name', product.name)
          .eq('shop', shop.id)
          .single();

        if (!existingProduct) {
          const productResult = await supabase.from('products').insert([product]).select().single();
          if (productResult.error) {
            console.error(`❌ Error creating product ${product.name}:`, productResult.error);
          } else {
            console.log(`✅ Product created: ${product.name}`);
          }
        } else {
          console.log(`✅ Product ${product.name} already exists`);
        }
      }
    }

    console.log('\n🎉 Database reset completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('👑 Admin: admin@example.com / admin123');
    console.log('🏪 Shop Admin: shopadmin@example.com / shopadmin123');
    console.log('👨‍🎓 Students:');
    console.log('   - john@student.com / student123');
    console.log('   - jane@student.com / student456');
    console.log('   - bob@student.com / student789');

  } catch (error) {
    console.error('❌ Database reset failed:', error);
  }
};

// Run the reset
resetDatabase(); 