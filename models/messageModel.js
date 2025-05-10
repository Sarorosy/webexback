const db = require('../db');

const togglePin = (user_id, message_id) => {
  return new Promise((resolve, reject) => {
    const getQuery = `SELECT pinned_users FROM tbl_messages WHERE id = ?`;
    db.query(getQuery, [message_id], (err, rows) => {
      if (err) return reject(err);
      if (!rows.length) return reject("Message not found");

      let pinnedUsers = [];
      try {
        pinnedUsers = JSON.parse(rows[0].pinned_users || "[]");
      } catch {
        pinnedUsers = [];
      }

      const index = pinnedUsers.indexOf(user_id);
      if (index > -1) {
        pinnedUsers.splice(index, 1); // Unpin
      } else {
        pinnedUsers.push(user_id); // Pin
      }

      const updateQuery = `UPDATE tbl_messages SET pinned_users = ? WHERE id = ?`;
      db.query(updateQuery, [JSON.stringify(pinnedUsers), message_id], (err2) => {
        if (err2) return reject(err2);
        resolve(pinnedUsers);
      });
    });
  });
};

module.exports = {
  togglePin
};
