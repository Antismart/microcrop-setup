const express = require('express');
const router = express.Router();

router.post('/webhook', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/plot/:plotId', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/trigger-capture', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
