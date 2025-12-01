const express = require('express');
const router = express.Router();
const ussdController = require('../controllers/ussd.controller');

// Africa's Talking USSD handler
router.post('/', ussdController.handleUssdRequest.bind(ussdController));

module.exports = router;
