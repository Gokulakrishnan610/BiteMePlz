import fetch from 'node-fetch';

const testAnalyticsEndpoint = async () => {
  const shopId = '441d2b97-00b8-48a4-a4cb-3ffd4d77a149'; // The shop ID from the error
  const baseUrl = 'http://localhost:5000';
  
  console.log('Testing analytics endpoint...');
  console.log(`Shop ID: ${shopId}`);
  console.log(`URL: ${baseUrl}/api/shops/${shopId}/analytics`);
  
  try {
    // First test the health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('Health check result:', healthData);
    
    if (healthData.status !== 'healthy') {
      console.error('Health check failed');
      return;
    }
    
    // Test the analytics endpoint
    console.log('\n2. Testing analytics endpoint...');
    const startTime = Date.now();
    
    const response = await fetch(`${baseUrl}/api/shops/${shopId}/analytics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add proper authentication headers here
        // 'Authorization': 'Bearer YOUR_TOKEN'
      }
    });
    
    const endTime = Date.now();
    console.log(`Response time: ${endTime - startTime}ms`);
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Analytics data received successfully');
      console.log('Data summary:', {
        totalProducts: data.totalProducts,
        orderStats: data.orderStats,
        dailyStatsLength: data.dailyStats?.length || 0,
        monthlySalesLength: data.monthlySales?.length || 0
      });
    } else {
      const errorText = await response.text();
      console.error('Analytics request failed:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code
    });
  }
};

// Run the test
testAnalyticsEndpoint().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
}); 