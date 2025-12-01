const redis = require('../../config/redis');
const prisma = require('../../config/database');
const logger = require('../../config/logger');
const PaymentService = require('../../services/payment.service');

const SESSION_TTL = 300; // 5 minutes

class UssdController {
  async handleUssdRequest(req, res) {
    try {
      const { sessionId, serviceCode, phoneNumber, text } = req.body;

      logger.info('USSD Request', { sessionId, phoneNumber, text });

      // Get or create session
      const sessionKey = `ussd:${sessionId}`;
      let sessionData = await redis.get(sessionKey);
      
      if (sessionData) {
        sessionData = JSON.parse(sessionData);
      } else {
        sessionData = {
          phoneNumber,
          step: 'MENU',
          data: {},
        };
      }

      // Parse user input
      const inputArray = text.split('*').filter(Boolean);
      const lastInput = inputArray[inputArray.length - 1] || '';

      // Check if user exists
      const farmer = await prisma.farmer.findUnique({
        where: { phoneNumber },
      });

      let response = '';

      if (!farmer && sessionData.step !== 'REGISTER') {
        // New user - start registration
        response = await this.startRegistration(sessionData);
      } else if (sessionData.step === 'REGISTER') {
        // Continue registration
        response = await this.handleRegistration(sessionData, lastInput, inputArray);
      } else {
        // Existing user - show main menu
        response = await this.handleMainMenu(sessionData, farmer, lastInput, inputArray);
      }

      // Save session
      await redis.setex(sessionKey, SESSION_TTL, JSON.stringify(sessionData));

      // Send response
      res.set('Content-Type', 'text/plain');
      res.send(response);

    } catch (error) {
      logger.error('USSD Error:', error);
      res.set('Content-Type', 'text/plain');
      res.send('END An error occurred. Please try again later.');
    }
  }

  async startRegistration(sessionData) {
    sessionData.step = 'REGISTER';
    sessionData.substep = 'NAME';
    return 'CON Welcome to MicroCrop Insurance!\nPlease enter your full name:';
  }

  async handleRegistration(sessionData, input, inputArray) {
    const substep = sessionData.substep;

    switch (substep) {
      case 'NAME':
        if (!input || input.length < 3) {
          return 'CON Invalid name. Please enter your full name:';
        }
        sessionData.data.name = input;
        sessionData.substep = 'ID';
        return 'CON Enter your National ID number:';

      case 'ID':
        if (!input || input.length < 6) {
          return 'CON Invalid ID. Please enter your National ID:';
        }
        sessionData.data.nationalId = input;
        sessionData.substep = 'COUNTY';
        return 'CON Select your County:\n1. Nairobi\n2. Kiambu\n3. Machakos\n4. Nakuru\n5. Kisumu\n6. Meru\n7. Other';

      case 'COUNTY':
        const counties = {
          '1': 'Nairobi',
          '2': 'Kiambu',
          '3': 'Machakos',
          '4': 'Nakuru',
          '5': 'Kisumu',
          '6': 'Meru',
          '7': 'Other',
        };
        const selectedCounty = counties[input];
        if (!selectedCounty) {
          return 'CON Invalid selection. Please select your County:\n1. Nairobi\n2. Kiambu\n3. Machakos\n4. Nakuru\n5. Kisumu\n6. Meru\n7. Other';
        }
        sessionData.data.county = selectedCounty;
        sessionData.substep = 'SUBCOUNTY';
        return `CON Enter your Sub-County name in ${selectedCounty}:`;

      case 'SUBCOUNTY':
        if (!input || input.length < 3) {
          return 'CON Invalid Sub-County. Please enter your Sub-County name:';
        }
        sessionData.data.subCounty = input;
        sessionData.substep = 'CONFIRM';
        
        const [firstName, ...lastNameParts] = sessionData.data.name.split(' ');
        const lastName = lastNameParts.join(' ') || firstName;

        return `CON Confirm your details:\nName: ${sessionData.data.name}\nID: ${sessionData.data.nationalId}\nCounty: ${sessionData.data.county}\nSub-County: ${sessionData.data.subCounty}\n\n1. Confirm\n2. Cancel`;

      case 'CONFIRM':
        if (input === '1') {
          // Save farmer to database
          const [firstName, ...lastNameParts] = sessionData.data.name.split(' ');
          const lastName = lastNameParts.join(' ') || firstName;

          try {
            await prisma.farmer.create({
              data: {
                phoneNumber: sessionData.phoneNumber,
                firstName,
                lastName,
                nationalId: sessionData.data.nationalId,
                county: sessionData.data.county,
                subCounty: sessionData.data.subCounty,
                kycStatus: 'PENDING',
              },
            });

            sessionData.step = 'MENU';
            delete sessionData.substep;
            delete sessionData.data;

            return 'END Registration successful! You will receive an SMS once your account is verified. Dial *384*12345# again to continue.';
          } catch (error) {
            logger.error('Registration error:', error);
            return 'END Registration failed. Please try again later.';
          }
        } else {
          delete sessionData.substep;
          delete sessionData.data;
          return 'END Registration cancelled.';
        }

      default:
        return 'END Invalid session. Please try again.';
    }
  }

  async handleMainMenu(sessionData, farmer, input, inputArray) {
    // Main menu for existing users
    if (inputArray.length === 1) {
      return `CON Welcome back, ${farmer.firstName}!\n1. Buy Insurance\n2. Check Policy\n3. Claim Status\n4. My Account\n5. Add Plot`;
    }

    const mainChoice = inputArray[1];

    switch (mainChoice) {
      case '1':
        return await this.handleBuyInsurance(sessionData, farmer, input, inputArray);
      
      case '2':
        return await this.handleCheckPolicy(sessionData, farmer, input, inputArray);
      
      case '3':
        return await this.handleClaimStatus(sessionData, farmer, input, inputArray);
      
      case '4':
        return await this.handleMyAccount(sessionData, farmer, input, inputArray);
      
      case '5':
        return await this.handleAddPlot(sessionData, farmer, input, inputArray);
      
      default:
        return 'END Invalid choice. Please try again.';
    }
  }

  async handleBuyInsurance(sessionData, farmer, input, inputArray) {
    // Get farmer's plots
    const plots = await prisma.plot.findMany({
      where: { farmerId: farmer.id },
    });

    if (plots.length === 0) {
      return 'END You have no plots. Please add a plot first.\n1. Add Plot\n0. Back';
    }

    if (inputArray.length === 2) {
      // Show plots
      let response = 'CON Select plot to insure:\n';
      plots.forEach((plot, index) => {
        response += `${index + 1}. ${plot.name} (${plot.acreage} acres)\n`;
      });
      response += '0. Back';
      return response;
    }

    const plotIndex = parseInt(inputArray[2]) - 1;
    if (plotIndex < 0 || plotIndex >= plots.length) {
      return 'END Invalid plot selection.';
    }

    const selectedPlot = plots[plotIndex];

    if (inputArray.length === 3) {
      return 'CON Select coverage type:\n1. Drought Only (KES 500/acre)\n2. Flood Only (KES 400/acre)\n3. Both (KES 800/acre)\n0. Back';
    }

    const coverageType = inputArray[3];
    const coverageMap = { '1': 'DROUGHT', '2': 'FLOOD', '3': 'BOTH' };
    const premiumMap = { '1': 500, '2': 400, '3': 800 };
    
    if (!coverageMap[coverageType]) {
      return 'END Invalid coverage type.';
    }

    const premium = premiumMap[coverageType] * selectedPlot.acreage;
    const sumInsured = premium * 10; // 10x premium

    if (inputArray.length === 4) {
      return `CON Insurance Quote:\nPlot: ${selectedPlot.name}\nCoverage: ${coverageMap[coverageType]}\nPremium: KES ${premium}\nSum Insured: KES ${sumInsured}\n\n1. Confirm & Pay\n0. Cancel`;
    }

    if (inputArray[4] === '1') {
      // Create policy and initiate payment
      const policyNumber = `POL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        const policy = await prisma.policy.create({
          data: {
            policyNumber,
            farmerId: farmer.id,
            plotId: selectedPlot.id,
            coverageType: coverageMap[coverageType],
            sumInsured,
            premium,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            status: 'PENDING_PAYMENT',
            droughtThreshold: { rainfall_mm: 30, period_days: 30 },
            floodThreshold: { rainfall_mm: 150, period_hours: 48 },
          },
        });

        // Initiate Swypt M-Pesa payment via STK Push
        try {
          const paymentResult = await PaymentService.initiatePremiumCollection(
            farmer.id,
            policy.id,
            premium,
            farmer.phoneNumber
          );

          if (paymentResult.success) {
            logger.info('Swypt STK Push initiated', {
              policyNumber,
              farmerId: farmer.id,
              swyptOrderID: paymentResult.transaction.metadata.swyptOrderID,
            });

            return `END Payment request sent to ${farmer.phoneNumber}.\nPolicy: ${policyNumber}\nAmount: KES ${premium}\n\nCheck your phone for M-Pesa prompt.\nEnter PIN to complete payment.`;
          } else {
            // Payment initiation failed, update policy status
            await prisma.policy.update({
              where: { id: policy.id },
              data: { status: 'CANCELLED' },
            });

            logger.error('Payment initiation failed', {
              policyNumber,
              error: paymentResult.error,
            });

            return `END Payment initialization failed.\nPlease try again or contact support.\nRef: ${policyNumber}`;
          }
        } catch (paymentError) {
          logger.error('Payment service error:', paymentError);
          
          // Update policy to cancelled on payment error
          await prisma.policy.update({
            where: { id: policy.id },
            data: { status: 'CANCELLED' },
          });

          return `END Payment service error.\nPlease try again later.\nRef: ${policyNumber}`;
        }
      } catch (error) {
        logger.error('Policy creation error:', error);
        return 'END Failed to create policy. Please try again.';
      }
    }

    return 'END Thank you for using MicroCrop!';
  }

  async handleCheckPolicy(sessionData, farmer, input, inputArray) {
    const policies = await prisma.policy.findMany({
      where: { farmerId: farmer.id },
      include: { plot: true },
      orderBy: { createdAt: 'desc' },
    });

    if (policies.length === 0) {
      return 'END You have no active policies.';
    }

    let response = 'END Your Policies:\n\n';
    policies.forEach((policy, index) => {
      response += `${index + 1}. ${policy.policyNumber}\nPlot: ${policy.plot.name}\nStatus: ${policy.status}\nCoverage: ${policy.coverageType}\n\n`;
    });

    return response;
  }

  async handleClaimStatus(sessionData, farmer, input, inputArray) {
    const payouts = await prisma.payout.findMany({
      where: { farmerId: farmer.id },
      orderBy: { initiatedAt: 'desc' },
      take: 5,
    });

    if (payouts.length === 0) {
      return 'END You have no claims yet.';
    }

    let response = 'END Recent Claims:\n\n';
    payouts.forEach((payout, index) => {
      response += `${index + 1}. KES ${payout.amount}\nStatus: ${payout.status}\n`;
      if (payout.mpesaRef) {
        response += `M-Pesa Ref: ${payout.mpesaRef}\n`;
      }
      response += '\n';
    });

    return response;
  }

  async handleMyAccount(sessionData, farmer, input, inputArray) {
    const plotCount = await prisma.plot.count({
      where: { farmerId: farmer.id },
    });

    const policyCount = await prisma.policy.count({
      where: { farmerId: farmer.id, status: 'ACTIVE' },
    });

    return `END Account Details:\nName: ${farmer.firstName} ${farmer.lastName}\nPhone: ${farmer.phoneNumber}\nCounty: ${farmer.county}\nPlots: ${plotCount}\nActive Policies: ${policyCount}\nKYC Status: ${farmer.kycStatus}`;
  }

  async handleAddPlot(sessionData, farmer, input, inputArray) {
    // Simplified plot addition
    if (inputArray.length === 2) {
      sessionData.plotData = {};
      return 'CON Enter plot name:';
    }

    if (inputArray.length === 3) {
      sessionData.plotData.name = input;
      return 'CON Enter plot size (in acres):';
    }

    if (inputArray.length === 4) {
      sessionData.plotData.acreage = parseFloat(input);
      return 'CON Select crop type:\n1. Maize\n2. Beans\n3. Potatoes\n4. Wheat\n5. Vegetables\n6. Other';
    }

    if (inputArray.length === 5) {
      const cropTypes = ['MAIZE', 'BEANS', 'POTATOES', 'WHEAT', 'VEGETABLES', 'OTHER'];
      const cropIndex = parseInt(input) - 1;
      
      if (cropIndex < 0 || cropIndex >= cropTypes.length) {
        return 'END Invalid crop type.';
      }

      sessionData.plotData.cropType = cropTypes[cropIndex];
      return 'CON Enter latitude (e.g. -1.2921):';
    }

    if (inputArray.length === 6) {
      sessionData.plotData.latitude = parseFloat(input);
      return 'CON Enter longitude (e.g. 36.8219):';
    }

    if (inputArray.length === 7) {
      sessionData.plotData.longitude = parseFloat(input);
      
      try {
        await prisma.plot.create({
          data: {
            farmerId: farmer.id,
            name: sessionData.plotData.name,
            acreage: sessionData.plotData.acreage,
            cropType: sessionData.plotData.cropType,
            latitude: sessionData.plotData.latitude,
            longitude: sessionData.plotData.longitude,
          },
        });

        return 'END Plot added successfully! You can now purchase insurance for this plot.';
      } catch (error) {
        logger.error('Plot creation error:', error);
        return 'END Failed to add plot. Please try again.';
      }
    }

    return 'END Invalid input. Please try again.';
  }
}

module.exports = new UssdController();
