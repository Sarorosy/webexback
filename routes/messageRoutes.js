const express = require('express');
const router = express.Router();
const { pinUnpinMessage } = require('../controllers/messageController');

router.post('/pin', pinUnpinMessage);

module.exports = router;
