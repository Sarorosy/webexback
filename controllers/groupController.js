const groupModel = require("../models/groupModel");
const chatModel = require('../models/chatModel');
const { getIO } = require('../socket'); 

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
      if (err2) return res.status(500).json({ status: false, message: "Error adding members: " + err2 });

      const io = getIO();

      const groupPayload = {
        id: group_id,
        name,
        type: "group",
        last_interacted_time: new Date().toISOString().slice(0, 19).replace('T', ' '), // "YYYY-MM-DD HH:MM:SS"
        user_type: null,
        email: null,
        user_panel: null,
        favourites: "[]",
        profile_pic: null,
        selected_members: members,
      };

      io.emit("group_created", groupPayload);

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

const updateGroup = (req, res) => {
    const { id, name, member_limit } = req.body;

    if (!id || !name || !member_limit) {
        return res.status(400).json({ status: false, message: "Group ID, name, and member_limit are required" });
    }

    groupModel.updateGroup(id, name, member_limit, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });

        // Fetch updated group to emit
        groupModel.getGroupById(id, (err2, updatedGroup) => {
            if (err2 || !updatedGroup) {
                return res.status(500).json({ status: false, message: "Error retrieving updated group" });
            }

            console.log(updatedGroup)
            const io = getIO();
            io.emit("group_updated", { id, name, type: "group", group: updatedGroup });

            res.json({ status: true, message: "Group updated", group: updatedGroup });
        });
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

const addMembers = (req, res) => {
    const { group_id, user_id, user_name, members } = req.body;

    if (!group_id || !user_id || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ status: false, message: "group_id, user_id, and members[] are required" });
    }

    groupModel.addMembersToGroup(group_id, members, (err, results) => {
        if (err) {
            return res.status(500).json({ status: false, message: "Database error while adding members" });
        }

        // After adding members, insert history message
        const message = `added ${members.length} people(s) to this group`;
        chatModel.insertMessage(user_id, group_id, "group", message, 1, (msgErr, msgResult) => {
            if (msgErr) {
                return res.status(500).json({ status: false, message: "Error inserting group history message" });
            }

            const io = getIO();
            const messageData = {
                id: msgResult.insertId,
                sender_id: user_id,
                receiver_id: group_id,
                user_type : "group",
                message,
                sender_name: user_name ?? "Admin",
                created_at: new Date().toISOString(),
                is_edited: 0,
                is_history: 1,
            };

            io.emit('new_message', messageData);

            res.json({ status: true, message: "Members added and message sent", data: results });
        });
    });
};

// Get members of a group
const getGroupMembers = (req, res) => {
    const groupId = req.params.group_id;

    groupModel.getGroupMembers(groupId, (err, members) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" + err });
        res.json({ status: true, members });
    });
};

// Remove member
const removeMember = (req, res) => {
    const { group_id, user_id, user_name, own = false } = req.body;

    groupModel.removeMember(group_id, user_id, (err) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });

        const message = own ? `left this group` : 'removed from this group';
        chatModel.insertMessage(user_id, group_id, "group", message, 1, (msgErr, msgResult) => {
            if (msgErr) {
                return res.status(500).json({ status: false, message: "Error inserting group history message" });
            }

            const io = getIO();
            const messageData = {
                id: msgResult.insertId,
                sender_id: user_id,
                receiver_id: group_id,
                user_type : "group",
                message,
                sender_name: user_name ?? "Admin",
                created_at: new Date().toISOString(),
                is_edited: 0,
                is_history: 1,
            };

            io.emit('new_message', messageData);
            io.emit('group_left', {id:group_id , user_id : user_id, type : "group"});

            res.json({ status: true, message: "Member removed" });
        });

        
    });
};

const deleteGroupHandler = (req, res) => {
    const { group_id } = req.body;

    if (!group_id) {
        return res.status(400).json({ status: false, message: "Group ID is required" });
    }

    // Delete group and related members
    groupModel.deleteGroup(group_id, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });

        const io = getIO();
        io.emit("group_deleted", { id: group_id, type: "group" });

        res.json({ status: true, message: "Group deleted successfully" });
    });
};

module.exports = {
    createGroup,
    getGroupById,
    updateGroup,
    getAllGroups,
    addMember,
    addMembers,
    getGroupMembers,
    removeMember,
    deleteGroupHandler
};
