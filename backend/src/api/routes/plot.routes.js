const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.get('/:farmerId', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.put('/:id', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
