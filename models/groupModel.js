const db = require("../db");

// Create new group
const createGroup = (data, callback) => {
    const { name, description, member_limit, created_by } = data;
    const query = "INSERT INTO tbl_groups (name, description, member_limit, created_by) VALUES (?, ?, ?, ?)";
    db.query(query, [name, description, member_limit, created_by], callback);
};

// Get group by ID
const getGroupById = (id, callback) => {
    const query = `
        SELECT 
            g.*, 
            COALESCE(u.name, 'Unknown User') AS created_by_username
        FROM tbl_groups g
        LEFT JOIN tbl_users u ON g.created_by = u.id
        WHERE g.id = ?
    `;
    db.query(query, [id], (err, results) => {
        if (err) return callback(err);
        callback(null, results[0]);
    });
};

const updateGroup = (id, name, member_limit, callback) => {
    const query = "UPDATE tbl_groups SET name = ?, member_limit = ? WHERE id = ?";
    db.query(query, [name, member_limit, id], callback);
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
const addMember = (group_id, user_id, callback) => {
    const query = "INSERT INTO tbl_group_members (group_id, user_id) VALUES (?, ?)";
    db.query(query, [group_id, user_id], callback);
};
const addMembersToGroup = (group_id, members, callback) => {
    if (!members.length) return callback(null, []);

    const values = members.map((user_id) => [group_id, user_id]);
    const query = "INSERT IGNORE INTO tbl_group_members (group_id, user_id) VALUES ?";

    db.query(query, [values], callback);
};


const getGroupMembers = (group_id, callback) => {
    const query = `
        SELECT u.id, u.name, u.email, u.profile_pic
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

const deleteGroup = (group_id, callback) => {
    const query1 = "DELETE FROM tbl_group_members WHERE group_id = ?";
    const query2 = "DELETE FROM tbl_groups WHERE id = ?";

    // First delete members, then the group
    db.query(query1, [group_id], (err) => {
        if (err) return callback(err);
        db.query(query2, [group_id], callback);
    });
};


module.exports = {
    createGroup,
    getGroupById,
    updateGroup,
    getAllGroups,
    addMember,
    addMembersToGroup,
    addMultipleMembers,
    getGroupMembers,
    removeMember,
    deleteGroup
};
