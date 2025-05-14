const db = require('../db');  // Assuming you have a db connection setup

// Function to insert a reminder
const createReminder = (msg_id, user_id, time) => {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO tbl_reminders (msg_id, user_id, time) VALUES (?, ?, ?)';
    db.query(query, [msg_id, user_id, time], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// Function to get all reminders for the current time
const getRemindersForTime = (currentTime) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT r.*, m.*
      FROM tbl_reminders r
      JOIN tbl_messages m ON m.id = r.msg_id
      WHERE r.time = ? AND m.is_deleted = 0
    `;
    db.query(query, [currentTime], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};


module.exports = {
  createReminder,
  getRemindersForTime
};
