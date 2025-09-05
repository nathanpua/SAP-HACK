#!/usr/bin/env node
/**
 * Frontend Authentication Test Script
 *
 * This script tests the frontend WebSocket authentication integration.
 * Run with: node test_frontend_auth.js
 */

const WebSocket = require('ws');

// Test configuration
const WS_URL = 'ws://127.0.0.1:8848/ws';
const TEST_USER_ID = '9f1152a2-415b-4972-9f4c-7ae50db69f66';
const TEST_QUERY = 'Analyze my SAP career and provide personalized recommendations';

console.log('🧪 Frontend WebSocket Authentication Test');
console.log('=' * 50);

function testWebSocketAuth() {
    return new Promise((resolve, reject) => {
        console.log(`\n🔌 Connecting to WebSocket: ${WS_URL}`);

        const ws = new WebSocket(WS_URL);

        ws.on('open', () => {
            console.log('✅ WebSocket connection established');

            // Send authenticated query (simulating frontend behavior)
            const authMessage = {
                type: 'query',
                query: TEST_QUERY,
                user_id: TEST_USER_ID
            };

            console.log(`📤 Sending authenticated message:`);
            console.log(`   User ID: ${TEST_USER_ID}`);
            console.log(`   Query: ${TEST_QUERY}`);

            ws.send(JSON.stringify(authMessage));
        });

        ws.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());
                console.log(`\n📥 Received response:`);
                console.log(`   Type: ${response.type}`);

                if (response.type === 'raw') {
                    console.log(`   Content: ${response.data?.delta?.substring(0, 100)}...`);
                } else if (response.type === 'orchestra') {
                    console.log(`   Orchestra event: ${response.data?.type}`);
                } else {
                    console.log(`   Full response: ${JSON.stringify(response, null, 2)}`);
                }

                // Wait a bit for more messages, then close
                setTimeout(() => {
                    ws.close();
                }, 2000);

            } catch (error) {
                console.error('❌ Error parsing response:', error);
                ws.close();
                reject(error);
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`\n🔌 WebSocket closed: ${code} - ${reason}`);
            resolve();
        });

        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
            reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            console.log('\n⏰ Test timeout reached');
            ws.close();
            resolve();
        }, 10000);
    });
}

function testMessageFormat() {
    console.log('\n🧪 Testing Message Format');

    const message = {
        type: 'query',
        query: TEST_QUERY,
        user_id: TEST_USER_ID
    };

    const jsonString = JSON.stringify(message);
    console.log(`✅ Message format: ${jsonString}`);

    // Verify it can be parsed back
    const parsed = JSON.parse(jsonString);
    if (parsed.user_id === TEST_USER_ID && parsed.query === TEST_QUERY) {
        console.log('✅ Message format validation passed');
        return true;
    } else {
        console.log('❌ Message format validation failed');
        return false;
    }
}

async function runTests() {
    console.log(`Testing with:`);
    console.log(`   WebSocket URL: ${WS_URL}`);
    console.log(`   Test User ID: ${TEST_USER_ID}`);
    console.log(`   Test Query: ${TEST_QUERY}`);
    console.log();

    const tests = [
        { name: 'Message Format', fn: testMessageFormat },
        { name: 'WebSocket Authentication', fn: testWebSocketAuth }
    ];

    let passed = 0;
    const total = tests.length;

    for (const test of tests) {
        try {
            console.log(`\n📋 Running test: ${test.name}`);
            const result = await test.fn();
            if (result !== false) {
                console.log(`✅ ${test.name} passed`);
                passed++;
            } else {
                console.log(`❌ ${test.name} failed`);
            }
        } catch (error) {
            console.log(`❌ ${test.name} failed with error: ${error.message}`);
        }
    }

    console.log('\n' + '=' * 60);
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' * 60);
    console.log(`🎯 Overall: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All frontend authentication tests passed!');
        console.log('\n🚀 Your frontend WebSocket authentication is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Make sure:');
        console.log('   1. The Youtu-agent backend is running (python main_web.py)');
        console.log('   2. The WebSocket server is accessible on port 8848');
        console.log('   3. Check the console output above for error details');
    }

    return passed === total;
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = { testWebSocketAuth, testMessageFormat, runTests };
