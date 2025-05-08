const groupModel = require("../models/groupModel");

// Create group
const createGroup = (req, res) => {
    const { name, description, member_limit, created_by, selectedMembers } = req.body;

    if (!name || !created_by) {
        return res.status(400).json({ status: false, message: "Name and creator are required" });
    }

    groupModel.createGroup({ name, description, member_limit, created_by }, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });

        const group_id = result.insertId;
        const members = Array.from(new Set([created_by, ...(selectedMembers || [])]));

        groupModel.addMultipleMembers(group_id, members, (err2) => {
            if (err2) return res.status(500).json({ status: false, message: "Error adding members" + err2 });

            res.status(201).json({ status: true, message: "Group created and members added", group_id });
        });
    });
};


// Get group by ID
const getGroupById = (req, res) => {
    const groupId = req.params.id;

    groupModel.getGroupById(groupId, (err, group) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        if (!group) return res.status(404).json({ status: false, message: "Group not found" });

        res.status(200).json({ status: true, group });
    });
};

// Get all groups
const getAllGroups = (req, res) => {
    groupModel.getAllGroups((err, groups) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        res.json({ status: true, groups });
    });
};

// Add member to group
const addMember = (req, res) => {
    const { group_id, user_id, role } = req.body;
    if (!group_id || !user_id) {
        return res.status(400).json({ status: false, message: "Group ID and User ID are required" });
    }

    groupModel.addMember(group_id, user_id, role || 'member', (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ status: false, message: "User already in group" });
            }
            return res.status(500).json({ status: false, message: "Database error" });
        }

        res.json({ status: true, message: "Member added to group" });
    });
};

// Get members of a group
const getGroupMembers = (req, res) => {
    const groupId = req.params.group_id;

    groupModel.getGroupMembers(groupId, (err, members) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        res.json({ status: true, members });
    });
};

// Remove member
const removeMember = (req, res) => {
    const { group_id, user_id } = req.body;

    groupModel.removeMember(group_id, user_id, (err) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        res.json({ status: true, message: "Member removed" });
    });
};

module.exports = {
    createGroup,
    getGroupById,
    getAllGroups,
    addMember,
    getGroupMembers,
    removeMember,
};
