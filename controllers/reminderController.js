const reminderModel = require('../models/reminderModel');
const { getIO } = require("../socket");

// Controller to create a reminder
const createReminder = async (req, res) => {
  const { msg_id, user_id, time } = req.body;
  try {
    const reminder = await reminderModel.createReminder(msg_id, user_id, time);
    res.status(201).json({ message: 'Reminder set successfully', reminder });
  } catch (error) {
    res.status(500).json({ error: 'Error creating reminder', details: error });
  }
};

// Controller to get reminders for the current time
const checkReminders = async (currentTime) => {
  try {
    const reminders = await reminderModel.getRemindersForTime(currentTime);
    if (reminders.length > 0) {
      reminders.forEach((reminder) => {
        // Emit reminder event to the user
        console.log("reminder found ❤" , reminder)
        const io = getIO();
        io.emit(`reminder`, { reminder });
      });
    }
  } catch (error) {
    console.error('Error fetching reminders:', error);
  }
};

module.exports = {
  createReminder,
  checkReminders
};
