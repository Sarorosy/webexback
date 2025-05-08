const chatModel = require('../models/chatModel'); // Assuming chatModel exists for DB queries
const { getIO } = require("../socket");
// Fetch groups and users interacted with the provided user
const getUserInteractedUsersAndGroups = (req, res) => {
    const userId = req.body.userId;

    // Fetch user-to-user interactions
    chatModel.getUserInteractions(userId, (err, users) => {
        if (err) return res.status(500).json({ status: false, message: "Error fetching user interactions: " + err });

        // Fetch group interactions
        chatModel.getGroupInteractions(userId, (err, groupInteractions) => {
            if (err) return res.status(500).json({ status: false, message: "Error fetching group interactions: " + err });

            // Fetch groups user is part of
            chatModel.getUserGroups(userId, (err, groupMemberships) => {
                if (err) return res.status(500).json({ status: false, message: "Error fetching group memberships: " + err });

                const groupIds = groupMemberships.map(g => g.group_id);

                if (groupIds.length === 0) {
                    // No groups, return just user and groupInteractions
                    const combined = [...users, ...groupInteractions];
                    combined.sort((a, b) => new Date(b.last_interacted_time || 0) - new Date(a.last_interacted_time || 0));
                    return res.json({ status: true, message: "Fetched successfully", data: combined });
                }

                // Fetch details for all groups the user is in
                chatModel.getGroupDetails(groupIds, (err, groupDetails) => {
                    if (err) return res.status(500).json({ status: false, message: "Error fetching group details: " + err });

                    // Merge groupDetails with groupInteractions (use last_interacted_time if available)
                    const groupMap = new Map();

                    groupDetails.forEach(group => {
                        groupMap.set(group.id, {
                            id: group.id,
                            name: group.name,
                            type: "group",
                            last_interacted_time: null // default
                        });
                    });

                    groupInteractions.forEach(interaction => {
                        groupMap.set(interaction.id, {
                            ...groupMap.get(interaction.id),
                            last_interacted_time: interaction.last_interacted_time
                        });
                    });

                    const mergedGroups = Array.from(groupMap.values());

                    // Final merged list
                    const combined = [...users, ...mergedGroups];
                    combined.sort((a, b) => new Date(b.last_interacted_time || 0) - new Date(a.last_interacted_time || 0));

                    res.json({
                        status: true,
                        message: "Fetched successfully",
                        data: combined
                    });
                });
            });
        });
    });
};



const getMessages = (req, res) => {
    const { sender_id, receiver_id, skip = 0, limit = 100 } = req.query;

    if (!sender_id || !receiver_id) {
        return res.status(400).json({ status: false, message: "sender_id and receiver_id are required" });
    }

    chatModel.getMessagesBetweenUsers(sender_id, receiver_id, parseInt(skip), parseInt(limit), (err, messages) => {
        if (err) {
            return res.status(500).json({ status: false, message: "Error fetching messages", error: err });
        }

        res.json(messages); // return just array
    });
};

const sendMessage = (req, res) => {
    const { sender_id, receiver_id, message } = req.body;

    if (!sender_id || !receiver_id || !message?.trim()) {
        return res.status(400).json({ status: false, message: "sender_id, receiver_id, and message are required" });
    }

    chatModel.insertMessage(sender_id, receiver_id, message, (err, result) => {
        if (err) {
            return res.status(500).json({ status: false, message: "Error sending message", error: err });
        }
        const io = getIO();

        // Emit to both users involved (you can also emit to rooms)
        const messageData = {
            id: result.insertId,
            sender_id,
            receiver_id,
            message,
            created_at: new Date().toISOString(),
            is_edited: 0,
        };

        io.emit('new_message', messageData);
        io.emit('new_message', messageData);

        res.status(200).json({ status: true, message: "Message sent", insertId: result.insertId });
    });
};


module.exports = { getUserInteractedUsersAndGroups,getMessages ,sendMessage};
