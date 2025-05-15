const chatModel = require('../models/chatModel');

const { getIO } = require("../socket");
// Fetch groups and users interacted with the provided user
const getUserInteractedUsersAndGroupsold = (req, res) => {
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
                            last_interacted_time: null, // default
                            user_type: null,
                            email: null,
                            user_panel: null,
                            favourites: group.favourites || "",
                            profile_pic: null
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

                // Get unread message counts
                chatModel.getUnreadMessageCounts(userId, (err, unreadCounts) => {
                    if (err) return res.status(500).json({ status: false, message: "Error fetching unread counts: " + err });
                    
                    // Create maps for faster lookups
                    const userUnreadMap = new Map();
                    const groupUnreadMap = new Map();
                    
                    // Process unread counts into maps
                    unreadCounts.forEach(item => {
                        if (item.type === 'user') {
                            userUnreadMap.set(item.id, item);
                        } else if (item.type === 'group') {
                            groupUnreadMap.set(item.id, item);
                        }
                    });
                    
                    // Add read status to users
                    users.forEach(user => {
                        const unreadInfo = userUnreadMap.get(user.id);
                        user.read_status = unreadInfo ? 1 : 0; // 1 means unread, 0 means read
                        if (unreadInfo) {
                            user.last_message_id = unreadInfo.last_message_id;
                        }
                    });
                    
                    // Add read status to group interactions
                    groupInteractions.forEach(group => {
                        const unreadInfo = groupUnreadMap.get(group.id);
                        group.read_status = unreadInfo ? 1 : 0;
                        if (unreadInfo) {
                            group.last_message_id = unreadInfo.last_message_id;
                        }
                    });

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
                                last_interacted_time: null, // default
                                user_type: null,
                                email: null,
                                user_panel: null,
                                favourites: group.favourites || "",
                                profile_pic: null,
                                read_status: 0, // default to read
                                last_message_id: null
                            });
                        });

                        groupInteractions.forEach(interaction => {
                            groupMap.set(interaction.id, {
                                ...groupMap.get(interaction.id),
                                last_interacted_time: interaction.last_interacted_time,
                                read_status: interaction.read_status || 0,
                                last_message_id: interaction.last_message_id || null
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
    });
};


const getMessagesOld = (req, res) => {
    const { sender_id, receiver_id, user_type = "user", skip = 0, limit = 100 } = req.query;

    if (!sender_id || !receiver_id) {
        return res.status(400).json({ status: false, message: "sender_id and receiver_id are required" });
    }

    chatModel.getMessagesBetweenUsers(
        sender_id,
        receiver_id,
        user_type,
        parseInt(skip),
        parseInt(limit),
        (err, messages) => {
            if (err) {
                return res.status(500).json({ status: false, message: "Error fetching messages", error: err });
            }

            res.json(messages); // return messages directly
        }
    );
};

const getMessages = (req, res) => {
    const { sender_id, receiver_id, user_type = "user", skip = 0, limit = 100,created_at = null } = req.query;

    if (!sender_id || !receiver_id) {
        return res.status(400).json({ status: false, message: "sender_id and receiver_id are required" });
    }

    chatModel.getMessagesBetweenUsers(
        sender_id,
        receiver_id,
        user_type,
        parseInt(skip),
        parseInt(limit),
        created_at,
        (err, messages) => {
            if (err) {
                return res.status(500).json({ status: false, message: "Error fetching messages", error: err });
            }

            // Get unread message IDs for the user
            chatModel.getUnreadMessages(sender_id, receiver_id, user_type, (err2, unreadRows) => {
                if (err2) {
                    console.log('Error fetching unread messages:', err2);
                    return res.json(messages);
                }
                console.log('Unread messages:', unreadRows);


                const unreadMessageIds = unreadRows.map(r => r.id);
                if (unreadMessageIds.length === 0) return res.json(messages);

                // Mark unread messages as read
                chatModel.markMessagesAsRead(sender_id, unreadMessageIds, (err3) => {
                    if (!err3) {
                        const io = getIO();
                        io.emit('read_message', {
                            user_id: sender_id,
                            message_ids: unreadMessageIds,
                            receiver_id,
                            user_type,
                        });
                    }
                    return res.json(messages);
                });
            });

        }
    );
};


const sendMessage = (req, res) => {
    const { sender_id, receiver_id, message, sender_name,profile_pic, user_type = "user", isReply, replyMsgId, is_file = 0 } = req.body;

    const file = req.file;
    const filename = is_file == 1 && file ? file.filename : null;

    if (!sender_id || !receiver_id || !message?.trim()) {
        return res.status(400).json({ status: false, message: "sender_id, receiver_id, and message are required" });
    }

    const io = getIO();

    if (isReply && replyMsgId) {
        // Insert only into tbl_replies
        chatModel.insertReply(replyMsgId, sender_id, message, (replyErr, result) => {
            if (replyErr) {
                return res.status(500).json({ status: false, message: "Error inserting reply", error: replyErr });
            }

            const replyData = {
                id: result.insertId,
                msg_id: replyMsgId,
                reply_message: message,
                user_type,
                sender_id,
                reply_user_name: sender_name,
                profile_pic,
                reply_at: new Date().toISOString(),
            };

            io.emit('new_reply', replyData);

            return res.status(200).json({ status: true, message: "Reply sent", insertId: result.insertId });
        });
    } else {
        
        // Insert only into tbl_messages
        chatModel.insertMessage(sender_id, receiver_id, user_type, message, 0,is_file, filename, (err, result) => {
            if (err) {
                return res.status(500).json({ status: false, message: "Error sending message", error: err });
            }

            const messageData = {
                id: result.insertId,
                sender_id,
                receiver_id,
                user_type,
                message,
                is_file: Number(is_file),
                filename,
                sender_name,
                profile_pic,
                created_at: new Date().toISOString(),
                is_edited: 0,
            };

            io.emit('new_message', messageData);

            return res.status(200).json({ status: true, message: "Message sent", insertId: result.insertId });
        });
    }
};

const readPersonsByMessageId = (req, res) => {
  const messageId = req.params.message_id; // Extract message_id from URL params

  if (!messageId) {
    return res.status(400).json({ status: false, message: 'message_id is required' });
  }

  // Get the user_ids from tbl_message_reads where message_id matches the provided message_id
  chatModel.getReadUsersByMessageId(messageId, (err, users) => {
    if (err) {
      console.log('Error fetching users who have read the message:', err);
      return res.status(500).json({ status: false, message: 'Error fetching read users', error: err });
    }

    if (users.length === 0) {
      return res.json({ status: true, message: 'No users have read this message', data: [] });
    }

    const userIds = users.map(user => user.user_id);
    chatModel.getUsersDetailsByIds(userIds, (err2, userDetails) => {
      if (err2) {
        console.log('Error fetching user details:', err2);
        return res.status(500).json({ status: false, message: 'Error fetching user details', error: err2 });
      }

      res.json({
        status: true,
        message: 'Users fetched successfully',
        data: userDetails, // Return the user details
      });
    });
  });
};

const markFavourite = async (req, res) => {
    try {
        const { id, user_id, type } = req.body;

        if (!id || !user_id || !type) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const updatedFavourites = await chatModel.markFavourite({ id, user_id, type });

        // Emit to the user who marked the favourite
        const io = getIO();
        io.emit("favouriteUpdated", {
            id,
            type,
            user_id,
            favourites: updatedFavourites,
        });

        res.status(200).json({
            message: "Favourite updated",
            favourites: updatedFavourites,
        });
    } catch (err) {
        console.error("Error updating favourite:", err);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getUserInteractedUsersAndGroups, getMessages, sendMessage, markFavourite, readPersonsByMessageId };
