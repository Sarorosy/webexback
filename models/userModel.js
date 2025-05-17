const db = require("../db");

// Find user by email
const findUserByEmail = (email, callback) => {
    const query = "SELECT * FROM tbl_users WHERE email = ?";
    db.query(query, [email], (err, results) => {
        if (err) return callback(err, null);
        callback(null, results.length ? results[0] : null);
    });
};

const updateUserToken = (userId, token, callback) => {
    const query = "UPDATE tbl_users SET token = ? WHERE id = ?";
    db.query(query, [token, userId], callback);
};

const getAllUsers = (callback) => {
    const query = "SELECT * FROM tbl_users WHERE trashed != 1";
    db.query(query, (err, results) => {
        if (err) return callback(err, null);
        callback(null, results);
    });
};

const getUsersForGroup = (excludedUserId, callback) => {
    const query = `
        SELECT 
            u.id, u.name, u.email, u.user_type,u.profile_pic, u.max_group_count,
            COUNT(gm.group_id) AS group_present_count,
            (COUNT(gm.group_id) < u.max_group_count) AS is_available
        FROM tbl_users u
        LEFT JOIN tbl_group_members gm ON gm.user_id = u.id
        WHERE u.id != ? AND u.trashed != 1
        GROUP BY u.id
    `;
    db.query(query, [excludedUserId], (err, results) => {
        if (err) return callback(err, null);
        callback(null, results);
    });
};

const getUsersExcludingIds = (excludeIds, callback) => {
    let query = `
        SELECT 
            u.id, u.name, u.email, u.user_type, u.profile_pic, u.max_group_count,
            COUNT(gm.group_id) AS group_present_count,
            (COUNT(gm.group_id) < u.max_group_count) AS is_available
        FROM tbl_users u
        LEFT JOIN tbl_group_members gm ON gm.user_id = u.id
        WHERE u.trashed != 1
    `;

    const params = [];

    if (excludeIds.length > 0) {
        const placeholders = excludeIds.map(() => '?').join(', ');
        query += ` AND u.id NOT IN (${placeholders})`;
        params.push(...excludeIds);
    }

    query += ` GROUP BY u.id`;

    db.query(query, params, (err, results) => {
        if (err) return callback(err, null);
        callback(null, results);
    });
};



const findUserById = (id, callback) => {
    const query = "SELECT id, name, pronouns, password, bio, email, profile_pic, user_panel,user_type, max_group_count, office_name, city_name, view_users, add_users, edit_users, delete_users, access_requests FROM tbl_users WHERE id = ?";
    db.query(query, [id], (err, results) => {
        if (err) return callback(err, null);
        if (results.length === 0) return callback(null, null);
        callback(null, results[0]);
    });
};


const updateUser = (id, userData, callback) => {
    const {
        name,
        pronouns,
        bio,
        password,
        profile_pic,
        user_panel,
        max_group_count,
        office_name,
        city_name
    } = userData;

    const query = `
        UPDATE tbl_users SET 
            name = ?, 
            pronouns = ?, 
            bio = ?, 
            password = ?, 
            profile_pic = ?, 
            user_panel = ?, 
            max_group_count = ?, 
            office_name = ?, 
            city_name = ?
        WHERE id = ?`;

    const values = [
        name,
        pronouns,
        bio,
        password,
        profile_pic,
        user_panel,
        max_group_count,
        office_name,
        city_name,
        id
    ];

    db.query(query, values, callback);
};


const updateUserTypeAndPermissions = (id, user_type, permissions, callback) => {
  const query = `
    UPDATE tbl_users 
    SET user_type = ?, 
        view_users = ?, 
        add_users = ?, 
        edit_users = ?, 
        delete_users = ?, 
        access_requests = ?
    WHERE id = ?
  `;

  const values = [
    user_type,
    permissions.view_users,
    permissions.add_users,
    permissions.edit_users,
    permissions.delete_users,
    permissions.access_requests,
    id,
  ];

  db.query(query, values, callback);
};



const addUser = (userData, callback) => {
    const { name, email, password, user_panel, max_group_count, office_name, city_name } = userData;
    const query = "INSERT INTO tbl_users (name, email, password, user_panel, max_group_count, office_name, city_name) VALUES (?, ?, ?, ?, ?, ?, ?)";
    db.query(query, [name, email, password, user_panel, max_group_count, office_name, city_name], callback);
};


// Soft delete user (set trashed = 1)
const softDeleteUser = (id, callback) => {
    const query = "UPDATE tbl_users SET trashed = 1 WHERE id = ?";
    db.query(query, [id], callback);
};

module.exports = { findUserByEmail, updateUserToken, getAllUsers, getUsersForGroup,getUsersExcludingIds, updateUser,updateUserTypeAndPermissions, findUserById, addUser, softDeleteUser };
