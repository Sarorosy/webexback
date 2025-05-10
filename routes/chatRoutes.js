const express = require('express');
const { getUserInteractedUsersAndGroups, getMessages,sendMessage, markFavourite } = require('../controllers/chatController');
const router = express.Router();

// Route to get groups and users the provided user has interacted with
router.post('/getGroupsAndUsersInteracted', getUserInteractedUsersAndGroups);

router.get('/messages', getMessages);

router.post('/send', sendMessage); 

router.post("/favourite", markFavourite);

module.exports = router;
