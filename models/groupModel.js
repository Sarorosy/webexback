const db = require("../db");

// Create new group
const createGroup = (data, callback) => {
    const { name, description, member_limit, created_by } = data;
    const query = "INSERT INTO tbl_groups (name, description, member_limit, created_by) VALUES (?, ?, ?, ?)";
    db.query(query, [name, description, member_limit, created_by], callback);
};

// Get group by ID
const getGroupById = (id, callback) => {
    const query = "SELECT * FROM tbl_groups WHERE id = ?";
    db.query(query, [id], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0]);
    });
};

const getAllGroups = (callback) => {
    const query = `
        SELECT 
            g.id AS group_id, g.name AS group_name, g.description, g.member_limit, g.created_by, g.created_at,
            u.id AS user_id, u.name AS user_name, u.email, u.profile_pic
        FROM tbl_groups g
        LEFT JOIN tbl_group_members gm ON g.id = gm.group_id
        LEFT JOIN tbl_users u ON gm.user_id = u.id
        ORDER BY g.id, u.id
    `;

    db.query(query, (err, results) => {
        if (err) return callback(err, null);

        // Group results by group_id
        const groups = {};
        results.forEach(row => {
            const {
                group_id, group_name, description, member_limit, created_by, created_at,
                user_id, user_name, email, profile_pic
            } = row;

            if (!groups[group_id]) {
                groups[group_id] = {
                    group_id,
                    group_name,
                    description,
                    member_limit,
                    created_by,
                    created_at,
                    members: []
                };
            }

            if (user_id) {
                groups[group_id].members.push({
                    user_id,
                    user_name,
                    email,
                    profile_pic
                });
            }
        });

        callback(null, Object.values(groups));
    });
};

// Add user to group
const addMember = (group_id, user_id, role = 'member', callback) => {
    const query = "INSERT INTO tbl_group_members (group_id, user_id, role) VALUES (?, ?, ?)";
    db.query(query, [group_id, user_id, role], callback);
};

// Get members of a group
const getGroupMembers = (group_id, callback) => {
    const query = `
        SELECT u.id, u.name, u.email, gm.role 
        FROM tbl_group_members gm 
        JOIN tbl_users u ON gm.user_id = u.id 
        WHERE gm.group_id = ?
    `;
    db.query(query, [group_id], callback);
};

// Remove member from group
const removeMember = (group_id, user_id, callback) => {
    const query = "DELETE FROM tbl_group_members WHERE group_id = ? AND user_id = ?";
    db.query(query, [group_id, user_id], callback);
};

const addMultipleMembers = (group_id, memberIds, callback) => {
    if (!memberIds.length) return callback(null); // No members to insert

    const values = memberIds.map(user_id => [group_id, user_id]);
    const query = "INSERT INTO tbl_group_members (group_id, user_id) VALUES ?";

    db.query(query, [values], callback);
};



module.exports = {
    createGroup,
    getGroupById,
    getAllGroups,
    addMember,
    addMultipleMembers,
    getGroupMembers,
    removeMember,
};
