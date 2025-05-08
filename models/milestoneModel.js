const db = require("../db");

// Get all milestones
const getAllMilestones = (callback) => {
    const query = "SELECT * FROM tbl_milestones";
    db.query(query, (err, results) => {
        if (err) return callback(err, null);
        callback(null, results);
    });
};

// Get milestone by ID
const getMilestoneById = (id, callback) => {
    const query = "SELECT * FROM tbl_milestones WHERE id = ?";
    db.query(query, [id], (err, results) => {
        if (err) return callback(err, null);
        if (results.length === 0) return callback(null, null);
        callback(null, results[0]);
    });
};

// Create a new milestone
const createMilestone = (milestoneData, callback) => {
    const { milestone_name, fld_addedon, status } = milestoneData;
    const query = "INSERT INTO tbl_milestones (milestone_name, fld_addedon, status) VALUES (?, ?, ?)";
    db.query(query, [milestone_name, fld_addedon, status], callback);
};

// Update milestone
const updateMilestone = (id, milestoneData, callback) => {
    const { milestone_name, fld_addedon, status } = milestoneData;
    const query = "UPDATE tbl_milestones SET milestone_name = ?, fld_addedon = ?, status = ? WHERE id = ?";
    db.query(query, [milestone_name, fld_addedon, status, id], callback);
};

// Delete (soft delete) milestone
const deleteMilestone = (id, callback) => {
    const query = "UPDATE tbl_milestones SET status = 'Inactive' WHERE id = ?";
    db.query(query, [id], callback);
};

module.exports = {
    getAllMilestones,
    getMilestoneById,
    createMilestone,
    updateMilestone,
    deleteMilestone
};
