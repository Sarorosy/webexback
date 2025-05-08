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
        SELECT id, name
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
            'user' AS type
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
            'group' AS type
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
        SELECT * FROM tbl_messages 
        WHERE 
            ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
            AND group_id IS NULL
        ORDER BY created_at DESC
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


module.exports = { getUserGroups, getUserInteractions,getGroupInteractions,getGroupDetails, getMessagesBetweenUsers,insertMessage};
