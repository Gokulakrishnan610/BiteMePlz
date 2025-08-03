import { supabase } from './config/supabase.js';
import { ProductService, OrderService } from './services/databaseService.js';

const testAnalytics = async (shopId) => {
  console.log('Testing analytics for shop:', shopId);
  
  try {
    // Test 1: Basic database connection
    console.log('\n1. Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('Database connection failed:', testError);
      return;
    }
    console.log('✓ Database connection successful');

    // Test 2: Find products
    console.log('\n2. Testing product retrieval...');
    const startTime1 = Date.now();
    const products = await ProductService.find({ shop: shopId });
    const endTime1 = Date.now();
    console.log(`✓ Found ${products.length} products in ${endTime1 - startTime1}ms`);

    // Test 3: Find orders
    console.log('\n3. Testing order retrieval...');
    const startTime2 = Date.now();
    const orders = await OrderService.find({ shop_id: shopId });
    const endTime2 = Date.now();
    console.log(`✓ Found ${orders.length} orders in ${endTime2 - startTime2}ms`);

    // Test 4: Calculate analytics
    console.log('\n4. Testing analytics calculation...');
    const startTime3 = Date.now();
    
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalPaidOrders = orders.filter(order => order.is_paid).length;
    const totalVerifiedOrders = orders.filter(order => order.is_verified).length;
    const totalExpiredOrders = orders.filter(order => order.status === 'expired').length;
    const totalRevenue = orders
      .filter(order => order.is_paid)
      .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);

    const endTime3 = Date.now();
    console.log(`✓ Analytics calculated in ${endTime3 - startTime3}ms`);
    console.log(`  - Total Products: ${totalProducts}`);
    console.log(`  - Total Orders: ${totalOrders}`);
    console.log(`  - Paid Orders: ${totalPaidOrders}`);
    console.log(`  - Verified Orders: ${totalVerifiedOrders}`);
    console.log(`  - Expired Orders: ${totalExpiredOrders}`);
    console.log(`  - Total Revenue: ${totalRevenue}`);

    console.log('\n✓ All tests completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
};

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const shopId = process.argv[2];
  if (!shopId) {
    console.error('Please provide a shop ID as an argument');
    process.exit(1);
  }
  
  testAnalytics(shopId).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testAnalytics }; 