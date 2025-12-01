/**
 * IPFS Service Test
 * Quick test to verify Pinata integration is working
 */

// Load environment variables
require('dotenv').config();

const ipfsService = require('./src/services/ipfs.service');

async function testIPFSIntegration() {
  console.log('🧪 Testing IPFS/Pinata Integration...\n');

  try {
    // Test 1: Initialize Service
    console.log('1️⃣  Initializing IPFS service...');
    await ipfsService.initialize();
    console.log('✅ Service initialized successfully\n');

    // Test 2: Check Status
    console.log('2️⃣  Checking service status...');
    const status = ipfsService.getStatus();
    console.log('Status:', JSON.stringify(status, null, 2));
    console.log('✅ Status check complete\n');

    // Test 3: Upload Test JSON
    console.log('3️⃣  Uploading test JSON to IPFS...');
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      platform: 'MicroCrop Insurance',
      message: 'IPFS Integration Test',
      version: '1.0'
    };

    const uploadResult = await ipfsService.uploadJSON(testData, {
      name: 'ipfs-test.json',
      keyvalues: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    console.log('Upload Result:');
    console.log('  CID:', uploadResult.cid);
    console.log('  IPFS URL:', uploadResult.ipfsUrl);
    console.log('  Gateway URL:', uploadResult.gatewayUrl);
    console.log('  Size:', uploadResult.size, 'bytes');
    console.log('✅ Upload successful\n');

    // Test 4: Retrieve Data
    console.log('4️⃣  Retrieving data from IPFS...');
    const retrievedData = await ipfsService.getData(uploadResult.cid);
    console.log('Retrieved Data:', JSON.stringify(retrievedData, null, 2));
    console.log('✅ Retrieval successful\n');

    // Test 5: Upload Damage Proof (Simulated)
    console.log('5️⃣  Uploading simulated damage proof...');
    const damageProof = {
      claimId: 'TEST-CLAIM-001',
      plotId: 'test-plot-uuid',
      farmerId: 'test-farmer-uuid',
      damageIndex: 0.72,
      weatherData: {
        stationId: 'WXM-TEST-12345',
        observations: [
          { timestamp: new Date().toISOString(), temperature: 35, precipitation: 0 },
          { timestamp: new Date().toISOString(), temperature: 36, precipitation: 0 }
        ],
        period: {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        metrics: {
          avgTemperature: 35.5,
          totalPrecipitation: 8.2,
          maxTemperature: 38,
          daysWithoutRain: 12
        }
      },
      vegetationData: {
        source: 'Spexi',
        ndviValues: [0.85, 0.75, 0.62, 0.55],
        changeDetection: {
          baselineNDVI: 0.85,
          currentNDVI: 0.55,
          decline: 0.35,
          percentageChange: -35
        },
        analysisDate: new Date().toISOString()
      },
      calculationDetails: {
        weatherStress: 0.75,
        vegetationStress: 0.68,
        components: {
          weatherWeight: 0.6,
          vegetationWeight: 0.4
        },
        thresholds: {
          noPayout: 0.3,
          maxPayout: 1.0
        }
      },
      assessmentTimestamp: new Date().toISOString()
    };

    const proofResult = await ipfsService.uploadDamageProof(damageProof);
    console.log('Damage Proof Upload:');
    console.log('  CID:', proofResult.cid);
    console.log('  Gateway URL:', proofResult.gatewayUrl);
    console.log('  Size:', proofResult.size, 'bytes');
    console.log('✅ Damage proof uploaded\n');

    // Summary
    console.log('═════════════════════════════════════════════');
    console.log('🎉 ALL IPFS TESTS PASSED!');
    console.log('═════════════════════════════════════════════');
    console.log('\n📋 Test Results Summary:');
    console.log('  ✅ Service initialization: PASS');
    console.log('  ✅ Status check: PASS');
    console.log('  ✅ JSON upload: PASS');
    console.log('  ✅ Data retrieval: PASS');
    console.log('  ✅ Damage proof upload: PASS');
    console.log('\n🔗 Gateway URLs for Verification:');
    console.log('  Test Data:', uploadResult.gatewayUrl);
    console.log('  Damage Proof:', proofResult.gatewayUrl);
    console.log('\n💡 You can access these URLs in your browser to verify the uploads!');
    console.log('\n✨ IPFS integration is fully operational and ready for production.\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n💥 Error Details:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('  1. Check that PINATA_JWT is set in .env file');
    console.error('  2. Verify JWT token is valid (not expired)');
    console.error('  3. Check network connectivity to Pinata');
    console.error('  4. Review logs in logs/combined.log for details');
    process.exit(1);
  }
}

// Run tests
testIPFSIntegration();
