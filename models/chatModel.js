const db = require('../db'); // Assuming db is configured properly

// Get all groups the user is a part of
const getUserGroups = (userId, callback) => {
    const query = `
        SELECT gm.group_id
        FROM tbl_group_members gm
        WHERE gm.user_id = ?;
    `;
    db.query(query, [userId], callback);
};
// Get details for a list of group IDs
const getGroupDetails = (groupIds, callback) => {
    const query = `
        SELECT id, name,favourites
        FROM tbl_groups
        WHERE id IN (?);
    `;
    db.query(query, [groupIds], callback);
};


// Get all direct user interactions (excluding self)
const getUserInteractions = (userId, callback) => {
    const query = `
        SELECT 
            IF(m.sender_id = ?, m.receiver_id, m.sender_id) AS id,
            ANY_VALUE(u.name) AS name,
            MAX(m.created_at) AS last_interacted_time,
            'user' AS type,
            ANY_VALUE(u.favourites) AS favourites,
            ANY_VALUE(u.profile_pic) AS profile_pic
        FROM tbl_messages m
        JOIN tbl_users u 
            ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
        WHERE m.group_id IS NULL
            AND (m.sender_id = ? OR m.receiver_id = ?)
            AND IF(m.sender_id = ?, m.receiver_id, m.sender_id) IS NOT NULL
        GROUP BY id;
    `;
    db.query(query, [userId, userId, userId, userId, userId], callback);
};


// Get all group interactions by the user
const getGroupInteractions = (userId, callback) => {
    const query = `
        SELECT 
            m.group_id AS id,
            g.name,
            MAX(m.created_at) AS last_interacted_time,
            'group' AS type,
             ANY_VALUE(g.favourites) AS favourites
        FROM tbl_messages m
        JOIN tbl_groups g ON g.id = m.group_id
        WHERE m.group_id IS NOT NULL
            AND (m.sender_id = ? OR m.receiver_id = ?)
        GROUP BY m.group_id;
    `;
    db.query(query, [userId, userId], callback);
};


///////////////////messages
const getMessagesBetweenUsers = (senderId, receiverId, skip, limit, callback) => {
    const query = `
        SELECT 
            m.*, 
            u.name AS sender_name,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', sub.id,
                        'msg_id', sub.msg_id,
                        'reply_message', sub.reply_message,
                        'sender_id', sub.sender_id,
                        'reply_user_name', sub.reply_user_name,
                        'reply_at', sub.reply_at
                    )
                )
                FROM (
                    SELECT r.id, r.msg_id, r.reply_message, r.sender_id, ru.name AS reply_user_name, r.reply_at
                    FROM tbl_replies r
                    LEFT JOIN tbl_users ru ON ru.id = r.sender_id
                    WHERE r.msg_id = m.id
                    ORDER BY r.id DESC
                ) AS sub
            ) AS replies
        FROM tbl_messages m
        JOIN tbl_users u ON m.sender_id = u.id
        WHERE 
            ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
            AND m.group_id IS NULL
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
    `;

    db.query(query, [senderId, receiverId, receiverId, senderId, limit, skip], callback);
};

  





const insertMessage = (sender_id, receiver_id, message, callback) => {
    const query = `
        INSERT INTO tbl_messages (sender_id, receiver_id, message, created_at)
        VALUES (?, ?, ?, NOW())
    `;
    db.query(query, [sender_id, receiver_id, message], callback);
};

const insertReply = (msgId, sender_id, replyMessage, callback) => {
    const query = `
        INSERT INTO tbl_replies (msg_id, sender_id, reply_message, reply_at)
        VALUES (?, ?, ?, NOW())
    `;
    db.query(query, [msgId, sender_id, replyMessage], callback);
};


const markFavourite = ({ id, user_id, type }) => {
    return new Promise((resolve, reject) => {
      const table = type === "user" ? "tbl_users" : "tbl_groups";
  
      const query = `SELECT favourites FROM ${table} WHERE id = ?`;
      db.query(query, [id], (err, rows) => {
        if (err) return reject(err);
        if (!rows.length) return reject("Not found");
  
        let favourites = [];
        try {
          favourites = JSON.parse(rows[0].favourites || "[]");
        } catch {
          favourites = [];
        }
  
        const index = favourites.indexOf(user_id);
        if (index > -1) {
          favourites.splice(index, 1); // remove
        } else {
          favourites.push(user_id); // add
        }
  
        const updateQuery = `UPDATE ${table} SET favourites = ? WHERE id = ?`;
        db.query(updateQuery, [JSON.stringify(favourites), id], (err2, result) => {
          if (err2) return reject(err2);
          resolve(favourites); // return updated list
        });
      });
    });
  };
  
module.exports = { getUserGroups, getUserInteractions,getGroupInteractions,getGroupDetails, getMessagesBetweenUsers,insertMessage,insertReply, markFavourite};
