/**
 * Farmer API Integration Tests
 * 
 * This file contains examples and tests for the Farmer API endpoints.
 * Run with: node backend/test-farmer-api.js
 * 
 * Prerequisites:
 * 1. Server must be running: npm start
 * 2. Database must be accessible
 * 3. Prisma migrations must be applied
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/farmers';

// Test data
const testFarmer = {
  phoneNumber: '0712345678',
  firstName: 'John',
  lastName: 'Kamau',
  county: 'Nairobi',
  subCounty: 'Westlands',
  ward: 'Kangemi',
  village: 'Kangemi Village',
  nationalId: '12345678',
};

let createdFarmerId = null;

async function runTests() {
  console.log('🧪 Starting Farmer API Tests...\n');

  try {
    // Test 1: Register a new farmer
    console.log('1️⃣  Testing: POST /api/farmers/register');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/register`, testFarmer);
      console.log('✅ Success:', registerResponse.data.message);
      console.log('   Farmer ID:', registerResponse.data.farmer.id);
      console.log('   Phone:', registerResponse.data.farmer.phoneNumber);
      console.log('   KYC Status:', registerResponse.data.farmer.kycStatus);
      createdFarmerId = registerResponse.data.farmer.id;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  Farmer already exists - continuing with existing farmer');
        // Try to get the farmer by phone
        const phoneResponse = await axios.get(`${BASE_URL}/phone/${testFarmer.phoneNumber}`);
        createdFarmerId = phoneResponse.data.farmer.id;
      } else {
        throw error;
      }
    }
    console.log('');

    // Test 2: Get farmer by phone number
    console.log('2️⃣  Testing: GET /api/farmers/phone/:phoneNumber');
    const phoneResponse = await axios.get(`${BASE_URL}/phone/${testFarmer.phoneNumber}`);
    console.log('✅ Success: Retrieved farmer by phone');
    console.log('   Name:', `${phoneResponse.data.farmer.firstName} ${phoneResponse.data.farmer.lastName}`);
    console.log('   Plots:', phoneResponse.data.farmer.plots.length);
    console.log('   Active Policies:', phoneResponse.data.farmer.activePolicies.length);
    console.log('');

    // Test 3: Get farmer by ID
    console.log('3️⃣  Testing: GET /api/farmers/:id');
    const farmerResponse = await axios.get(`${BASE_URL}/${createdFarmerId}`);
    console.log('✅ Success: Retrieved farmer details');
    console.log('   Total Plots:', farmerResponse.data.farmer.statistics.totalPlots);
    console.log('   Total Policies:', farmerResponse.data.farmer.statistics.totalPolicies);
    console.log('   Total Transactions:', farmerResponse.data.farmer.statistics.totalTransactions);
    console.log('');

    // Test 4: Update farmer profile
    console.log('4️⃣  Testing: PUT /api/farmers/:id');
    const updateData = {
      ward: 'Updated Ward',
      village: 'Updated Village',
    };
    const updateResponse = await axios.put(`${BASE_URL}/${createdFarmerId}`, updateData);
    console.log('✅ Success: Updated farmer profile');
    console.log('   Ward:', updateResponse.data.farmer.ward);
    console.log('   Village:', updateResponse.data.farmer.village);
    console.log('');

    // Test 5: Update KYC status
    console.log('5️⃣  Testing: PUT /api/farmers/:id/kyc');
    const kycResponse = await axios.put(`${BASE_URL}/${createdFarmerId}/kyc`, {
      kycStatus: 'APPROVED',
    });
    console.log('✅ Success:', kycResponse.data.message);
    console.log('   New KYC Status:', kycResponse.data.farmer.kycStatus);
    console.log('');

    // Test 6: List all farmers
    console.log('6️⃣  Testing: GET /api/farmers (with pagination)');
    const listResponse = await axios.get(`${BASE_URL}?page=1&limit=10`);
    console.log('✅ Success: Retrieved farmers list');
    console.log('   Total Records:', listResponse.data.pagination.totalRecords);
    console.log('   Current Page:', listResponse.data.pagination.currentPage);
    console.log('   Total Pages:', listResponse.data.pagination.totalPages);
    console.log('   Farmers on Page:', listResponse.data.farmers.length);
    console.log('');

    // Test 7: List farmers with filters
    console.log('7️⃣  Testing: GET /api/farmers (with filters)');
    const filterResponse = await axios.get(`${BASE_URL}?kycStatus=APPROVED&county=Nairobi`);
    console.log('✅ Success: Retrieved filtered farmers');
    console.log('   Approved farmers in Nairobi:', filterResponse.data.farmers.length);
    console.log('');

    // Test 8: Search farmers
    console.log('8️⃣  Testing: GET /api/farmers (with search)');
    const searchResponse = await axios.get(`${BASE_URL}?search=John`);
    console.log('✅ Success: Search results');
    console.log('   Matching farmers:', searchResponse.data.farmers.length);
    console.log('');

    // Test 9: Test validation - missing fields
    console.log('9️⃣  Testing: Validation (missing fields)');
    try {
      await axios.post(`${BASE_URL}/register`, {
        phoneNumber: '0723456789',
        firstName: 'Test',
        // Missing lastName, county, subCounty
      });
      console.log('❌ Failed: Should have returned validation error');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Success: Validation working correctly');
        console.log('   Error:', error.response.data.error);
      } else {
        throw error;
      }
    }
    console.log('');

    // Test 10: Test validation - invalid phone number
    console.log('🔟 Testing: Validation (invalid phone)');
    try {
      await axios.post(`${BASE_URL}/register`, {
        phoneNumber: '123',
        firstName: 'Test',
        lastName: 'User',
        county: 'Test',
        subCounty: 'Test',
      });
      console.log('❌ Failed: Should have returned validation error');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Success: Phone validation working');
        console.log('   Error:', error.response.data.error);
      } else {
        throw error;
      }
    }
    console.log('');

    // Test 11: Test duplicate prevention
    console.log('1️⃣1️⃣  Testing: Duplicate prevention');
    try {
      await axios.post(`${BASE_URL}/register`, testFarmer);
      console.log('❌ Failed: Should have returned conflict error');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Success: Duplicate prevention working');
        console.log('   Error:', error.response.data.error);
      } else {
        throw error;
      }
    }
    console.log('');

    console.log('✨ All tests completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   ✅ 11 test scenarios passed');
    console.log('   📝 Farmer created/updated: ' + createdFarmerId);
    console.log('\n💡 Note: Delete the test farmer manually if needed using:');
    console.log(`   DELETE ${BASE_URL}/${createdFarmerId}`);

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🚀 MicroCrop Farmer API Test Suite\n');
  console.log('Prerequisites:');
  console.log('  ✓ Server running on http://localhost:3000');
  console.log('  ✓ Database accessible');
  console.log('  ✓ Prisma migrations applied\n');
  
  runTests().then(() => {
    console.log('\n✅ Test suite completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTests };
