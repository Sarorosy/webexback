const express = require('express');
const router = express.Router();
const { pinUnpinMessage, findMessages } = require('../controllers/messageController');

router.post('/pin', pinUnpinMessage);
router.post('/find', findMessages);

module.exports = router;
