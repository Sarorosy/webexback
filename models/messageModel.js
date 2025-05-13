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

const findMessages = (logged_in_userid, find_in_userid, query) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.group_id,
        u.name AS sender_name,
        u.profile_pic,
        m.message,
        m.created_at
      FROM tbl_messages m
      JOIN tbl_users u ON m.sender_id = u.id
      WHERE 
        (
          (m.sender_id = ? AND m.receiver_id = ?) 
          OR 
          (m.receiver_id = ? AND m.sender_id = ?)
        )
        AND m.is_history != 1
        AND m.message LIKE CONCAT('%', ?, '%')
      ORDER BY m.created_at DESC
    `;
    
    db.query(sql, [
      logged_in_userid,
      find_in_userid,
      logged_in_userid,
      find_in_userid,
      query
    ], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};




module.exports = {
  togglePin,
  findMessages
};
