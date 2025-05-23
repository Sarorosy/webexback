const db = require('../db'); // Assuming db is configured properly
const moment = require('moment-timezone');

// Get IST timestamp string like '2025-05-12 16:15:00'
const getISTTime = () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");


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
const getUserInteractionsold = (userId, callback) => {
  const query = `
        SELECT 
            IF(m.sender_id = ?, m.receiver_id, m.sender_id) AS id,
            MAX(u.name) AS name,
            MAX(u.user_type) AS user_type,
            MAX(u.email) AS email,
            MAX(u.user_panel) AS user_panel,
            MAX(m.created_at) AS last_interacted_time,
            'user' AS type,
            MAX(u.favourites) AS favourites,
            MAX(u.profile_pic) AS profile_pic
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
const getGroupInteractionsold = (userId, callback) => {
  const query = `
        SELECT 
            m.group_id AS id,
            g.name,
            MAX(m.created_at) AS last_interacted_time,
            'group' AS type,
             MAX(g.favourites) AS favourites
        FROM tbl_messages m
        JOIN tbl_groups g ON g.id = m.group_id
        WHERE m.group_id IS NOT NULL
            AND (m.sender_id = ? OR m.receiver_id = ?)
        GROUP BY m.group_id;
    `;
  db.query(query, [userId, userId], callback);
};

const getUserInteractions = (userId, callback) => {
    const query = `
        SELECT 
            IF(m.sender_id = ?, m.receiver_id, m.sender_id) AS id,
            MAX(u.name) AS name,
            MAX(u.user_type) AS user_type,
            MAX(u.email) AS email,
            MAX(u.user_panel) AS user_panel,
            MAX(m.created_at) AS last_interacted_time,
            'user' AS type,
            MAX(u.favourites) AS favourites,
            MAX(u.profile_pic) AS profile_pic,
            MAX(m.id) AS last_message_id
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
            MAX(g.favourites) AS favourites,
            MAX(m.id) AS last_message_id
        FROM tbl_messages m
        JOIN tbl_groups g ON g.id = m.group_id
        WHERE m.group_id IS NOT NULL
        GROUP BY m.group_id;
    `;
    db.query(query, [], callback);
};


const getUnreadMessageCounts = (userId, callback) => {
    const query = `
        SELECT 
            CASE 
                WHEN m.group_id IS NULL THEN IF(m.sender_id = ?, m.receiver_id, m.sender_id)
                ELSE m.group_id
            END AS id,
            CASE 
                WHEN m.group_id IS NULL THEN 'user'
                ELSE 'group'
            END AS type,
            COUNT(*) AS unread_count,
            MAX(m.id) AS last_message_id,
            MAX(JSON_CONTAINS(m.mentioned_users, JSON_ARRAY(?))) AS is_mentioned
        FROM tbl_messages m
        LEFT JOIN tbl_message_reads r 
            ON m.id = r.message_id AND r.user_id = ?
        LEFT JOIN tbl_group_members gm 
            ON gm.group_id = m.group_id AND gm.user_id = ?
        WHERE 
            (
                (m.group_id IS NULL AND m.receiver_id = ? AND r.id IS NULL)
                OR
                (m.group_id IS NOT NULL AND m.sender_id != ? AND r.id IS NULL AND gm.user_id IS NOT NULL)
            )
        GROUP BY id, type;
    `;

    db.query(query, [userId, userId, userId, userId, userId, userId], callback);
};


// Get unread message counts for both users and groups
const getUnreadMessageCountsold = (userId, callback) => {
    const query = `
        SELECT 
            m.id AS last_message_id,
            CASE 
                WHEN m.group_id IS NULL THEN IF(m.sender_id = ?, m.receiver_id, m.sender_id)
                ELSE m.group_id
            END AS id,
            CASE 
                WHEN m.group_id IS NULL THEN 'user'
                ELSE 'group'
            END AS type
        FROM tbl_messages m
        LEFT JOIN tbl_message_reads r ON m.id = r.message_id AND r.user_id = ?
        WHERE 
            (
                /* User-to-user messages not sent by this user and not read */
                (m.group_id IS NULL AND m.receiver_id = ? AND r.id IS NULL)
                OR
                /* Group messages not sent by this user and not read */
                (m.group_id IS NOT NULL AND m.sender_id != ? AND r.id IS NULL)
            )
        GROUP BY id, type;
    `;
    db.query(query, [userId, userId, userId, userId], callback);
};
const getMessagesBetweenUsers = (senderId, receiverId, userType, skip, limit, createdAt, callback) => {
  let query = `
    SELECT 
      m.*, 
      u.name AS sender_name,
      u.profile_pic,
      r.id AS reply_id,
      r.msg_id AS reply_msg_id,
      r.reply_message,
      r.sender_id AS reply_sender_id,
      ru.name AS reply_user_name,
      r.reply_at
    FROM tbl_messages m
    JOIN tbl_users u ON m.sender_id = u.id
    LEFT JOIN tbl_replies r ON r.msg_id = m.id
    LEFT JOIN tbl_users ru ON ru.id = r.sender_id
    WHERE 
  `;

  let params = [];

  if (userType === 'user') {
    query += `((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) AND m.group_id IS NULL`;
    params.push(senderId, receiverId, receiverId, senderId);
  } else {
    query += `m.group_id = ?`;
    params.push(receiverId);
  }
  if (createdAt) {
    query += ` AND m.created_at BETWEEN DATE_SUB(?, INTERVAL 1 DAY) AND DATE_ADD(?, INTERVAL 1 DAY)`;
    params.push(createdAt, createdAt);
  }

  query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, skip);

  db.query(query, params, (err, results) => {
    if (err) {
      return callback(err, null);
    }

    const messages = results.reduce((acc, row) => {
      let message = acc.find(m => m.id === row.id);
      if (!message) {
        message = {
          ...row,
          replies: []
        };
        acc.push(message);
      }

      if (row.reply_id) {
        message.replies.push({
          id: row.reply_id,
          msg_id: row.reply_msg_id,
          reply_message: row.reply_message,
          sender_id: row.reply_sender_id,
          reply_user_name: row.reply_user_name,
          reply_at: row.reply_at
        });
      }

      return acc;
    }, []);

    callback(null, messages);
  });
};



const insertMessage = (
  sender_id,
  receiver_id,
  user_type = "user",
  message,
  is_history = 0,
  is_file = 0,
  filename = null,
  mentioned_users = null,
  callback
) => {
  const createdAt = getISTTime();

  let query = '';
  let values = [];

  if (user_type === 'user') {
    query = `
      INSERT INTO tbl_messages (
        sender_id, receiver_id, message, is_history, created_at, is_file, filename, mentioned_users
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    values = [sender_id, receiver_id, message, is_history, createdAt, is_file, filename,mentioned_users];
  } else {
    query = `
      INSERT INTO tbl_messages (
        sender_id, group_id, message, is_history, created_at, is_file, filename, mentioned_users
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    values = [sender_id, receiver_id, message, is_history, createdAt, is_file, filename, mentioned_users];
  }

  db.query(query, values, callback);
};


const insertReply = (msgId, sender_id, replyMessage, callback) => {
  const replyAt = getISTTime(); // IST timestamp

  const query = `
    INSERT INTO tbl_replies (msg_id, sender_id, reply_message, reply_at)
    VALUES (?, ?, ?, ?)
  `;
  db.query(query, [msgId, sender_id, replyMessage, replyAt], callback);
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

const markMessagesAsRead = (userId, messageIds, callback) => {
  if (!messageIds.length) return callback(null, []); // No messages to mark as read
  console.log('Marking messages as read:', messageIds);

  const values = messageIds.map(msgId => [msgId, userId]);
  const query = `
    INSERT IGNORE INTO tbl_message_reads (message_id, user_id) VALUES ?
  `;
  db.query(query, [values], callback);
};


const getUnreadMessages = (userId, receiverId, userType, callback) => {
  let baseQuery = `
    SELECT m.id
    FROM tbl_messages m
    LEFT JOIN tbl_message_reads r ON m.id = r.message_id AND r.user_id = ?
    WHERE r.id IS NULL
  `;
  const params = [userId];

  if (userType === 'user') {
    baseQuery += ` AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) AND m.group_id IS NULL`;
    params.push(receiverId, userId, userId, receiverId);
  } else {
    baseQuery += ` AND m.group_id = ?`;
    params.push(receiverId);
  }

  db.query(baseQuery, params, callback);
};

const getReadUsersByMessageId = (messageId, callback) => {
  const query = `
    SELECT user_id
    FROM tbl_message_reads
    WHERE message_id = ?;
  `;
  db.query(query, [messageId], callback);
};

// Fetch user details (name, profile_pic) for an array of user_ids
const getUsersDetailsByIds = (userIds, callback) => {
  const query = `
    SELECT id, name, profile_pic
    FROM tbl_users
    WHERE id IN (?);
  `;
  db.query(query, [userIds], callback);
};


module.exports = {
  getUserGroups,
  markMessagesAsRead,
  getUnreadMessages,
  getUserInteractions,
  getGroupInteractions,
  getGroupDetails,
  getMessagesBetweenUsers,
  insertMessage,
  insertReply,
  markFavourite,
  getReadUsersByMessageId,
  getUsersDetailsByIds,
  getUnreadMessageCounts
};

