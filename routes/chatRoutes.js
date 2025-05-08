const express = require('express');
const { getUserInteractedUsersAndGroups, getMessages,sendMessage } = require('../controllers/chatController');
const router = express.Router();

// Route to get groups and users the provided user has interacted with
router.post('/getGroupsAndUsersInteracted', getUserInteractedUsersAndGroups);

router.get('/messages', getMessages);

router.post('/send', sendMessage); 

module.exports = router;
