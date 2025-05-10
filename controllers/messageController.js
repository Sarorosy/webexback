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

module.exports = {
  pinUnpinMessage
};
