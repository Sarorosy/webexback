const express = require('express');
const router = express.Router();
const { pinUnpinMessage,getPinnedMessages, findMessages, totalFindMessages } = require('../controllers/messageController');

router.post('/pin', pinUnpinMessage);
router.post('/pinned-messages', getPinnedMessages);
router.post('/find', findMessages);
router.post('/totalfind', totalFindMessages);

module.exports = router;
