// Test script for Wallet WebSocket functionality
// Run this in the browser console to test real-time wallet updates

console.log('🔌 Wallet WebSocket Test Script Loaded');

// Test WebSocket connection
function testWalletWebSocket(userId) {
    const wsUrl = window.location.hostname === 'localhost' 
        ? `ws://localhost:8000/ws/wallet/?user_id=${userId}`
        : `wss://rec-kiosk.onrender.com/ws/wallet/?user_id=${userId}`;
    
    console.log('🔗 Connecting to Wallet WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('✅ Wallet WebSocket connected successfully');
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Wallet WebSocket message received:', data);
            
            if (data.type === 'wallet_update') {
                console.log('💰 Wallet Update:', {
                    user_id: data.user_id,
                    balance: data.balance,
                    change: data.change,
                    transaction_type: data.transaction_type
                });
            } else if (data.type === 'connection_established') {
                console.log('✅ Connection confirmed:', data.message);
            }
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('❌ Wallet WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('🔌 Wallet WebSocket connection closed');
    };
    
    return ws;
}

// Test API endpoint to trigger wallet update
async function testWalletUpdate(userId, balance = 150.0, change = 25.0) {
    const apiUrl = window.location.hostname === 'localhost'
        ? `http://localhost:8000/api/test-wallet-update/`
        : `https://rec-kiosk.onrender.com/api/test-wallet-update/`;
    
    try {
        console.log('🚀 Triggering wallet update for user:', userId);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                balance: balance,
                change: change,
                transaction_type: 'test_payment'
            })
        });
        
        const result = await response.json();
        console.log('📡 API Response:', result);
        
        if (response.ok) {
            console.log('✅ Wallet update triggered successfully');
        } else {
            console.error('❌ Failed to trigger wallet update:', result);
        }
    } catch (error) {
        console.error('❌ Error calling wallet update API:', error);
    }
}

// Quick test function
function quickTest() {
    // Replace with your actual user ID
    const testUserId = 'your-user-id-here';
    
    console.log('🧪 Starting Quick Wallet WebSocket Test...');
    
    // Connect to WebSocket
    const ws = testWalletWebSocket(testUserId);
    
    // Wait 2 seconds then trigger update
    setTimeout(() => {
        testWalletUpdate(testUserId, 200.0, 50.0);
    }, 2000);
    
    // Clean up after 10 seconds
    setTimeout(() => {
        ws.close();
        console.log('🧹 Test completed, WebSocket closed');
    }, 10000);
}

// Export functions for manual testing
window.walletWebSocketTest = {
    testWalletWebSocket,
    testWalletUpdate,
    quickTest
};

console.log('📋 Available test functions:');
console.log('- walletWebSocketTest.testWalletWebSocket(userId)');
console.log('- walletWebSocketTest.testWalletUpdate(userId, balance, change)');
console.log('- walletWebSocketTest.quickTest()');
console.log('');
console.log('💡 Usage: Replace "your-user-id-here" with your actual user ID and run quickTest()');
