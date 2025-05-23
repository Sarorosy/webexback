const express = require('express');
const uploadChat = require('../middlewares/uploadMiddleware');
const { getUserInteractedUsersAndGroups, getMessages,sendMessage, markFavourite, readPersonsByMessageId } = require('../controllers/chatController');
const router = express.Router();

// Route to get groups and users the provided user has interacted with
router.post('/getGroupsAndUsersInteracted', getUserInteractedUsersAndGroups);

router.get('/messages', getMessages);

// router.post('/send', uploadChat.single("selectedFile"), sendMessage);
router.post('/send', sendMessage);


router.post("/favourite", markFavourite);

router.get('/read-persons/:message_id', readPersonsByMessageId);

module.exports = router;
