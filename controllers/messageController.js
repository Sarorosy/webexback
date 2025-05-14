const messageModel = require('../models/messageModel');
const { getIO } = require('../socket');

const pinUnpinMessage = async (req, res) => {
  const { user_id, message_id } = req.body;

  if (!user_id || !message_id) {
    return res.status(400).json({ message: "user_id and message_id are required" });
  }

  try {
    const updatedUsers = await messageModel.togglePin(user_id, message_id);

    const io = getIO();
    io.emit("pinUpdated", {
      message_id,
      user_id,
      pinned_users: updatedUsers
    });

    res.status(200).json({
      message: "Pin status updated",
      pinned_users: updatedUsers
    });
  } catch (err) {
    console.error("Pin error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

const findMessages = async (req, res) => {
  const { query, logged_in_userid, find_in_userid, type } = req.body;

  if (!query || !logged_in_userid || !find_in_userid || !type) {
    return res.status(400).json({ message: "Query, logged_in_userid, find_in_userid, and type are required" });
  }

  try {
    const messages = await messageModel.findMessages(logged_in_userid, find_in_userid, query, type);

    return res.status(200).json({ messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

const totalFindMessages = async (req, res) => {
  const { sender_id, query } = req.body;

  if (!query || !sender_id) {
    return res.status(400).json({ message: "Query and sender_id are required" });
  }

  try {
    const result = await messageModel.totalFindMessages(sender_id, query);

    // 1. Add type and profile_pic fallback to users and groups
    const mergedResults = [
      ...result.users.map(user => ({
        id: user.id,
        name: user.name,
        profile_pic: user.profile_pic || null,
        type: "user"
      })),
      ...result.groups.map(group => ({
        id: group.id,
        name: group.name,
        profile_pic: group.group_pic || null,
        type: "group"
      }))
    ];

    // Messages already have type and user info from the model

    res.status(200).json({
      results: mergedResults,
      messages: result.messages
    });
  } catch (err) {
    console.error("Error in totalFindMessages:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

const getPinnedMessages = async (req, res) => {
  const { user_id, search_user_id, type } = req.body;
  
  if (!user_id || !search_user_id || !type) {
    return res.status(400).json({ 
      message: "user_id, search_user_id, and type are required" 
    });
  }
  
  try {
    const messages = await messageModel.getPinnedMessages(user_id, search_user_id, type);
    return res.status(200).json({ messages });
  } catch (err) {
    console.error("Error fetching pinned messages:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};




module.exports = {
  pinUnpinMessage,
  getPinnedMessages,
  findMessages,
  totalFindMessages
};
