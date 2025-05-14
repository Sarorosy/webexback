const express = require('express');
const reminderController = require('../controllers/reminderController');
const router = express.Router();

// POST route to create a reminder
router.post('/reminder', reminderController.createReminder);

module.exports = router;
