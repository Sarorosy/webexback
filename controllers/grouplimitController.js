const grouplimitModel = require('../models/grouplimitModel');

const sendRequest = async (req, res) => {
  const { sender_id, group_id } = req.body;

  if (!sender_id || !group_id) {
    return res.status(400).json({ status: false, message: "sender_id and group_id are required" });
  }

  try {
    const result = await grouplimitModel.sendRequest(sender_id, group_id);
    return res.status(200).json({ status: true, message: "Request sent", result });
  } catch (err) {
    console.error("Send request error:", err);
    return res.status(500).json({ status: false, message: "Server error", error: err });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const result = await grouplimitModel.getAllRequests();
    return res.status(200).json({ status: true, requests: result });
  } catch (err) {
    console.error("Fetch requests error:", err);
    return res.status(500).json({ status: false, message: "Server error", error: err });
  }
};

const approveRequest = async (req, res) => {
  const { id, member_limit } = req.body;

  if (!id || member_limit === undefined) {
    return res.status(400).json({ status: false, message: "id and member_limit are required" });
  }

  try {
    const result = await grouplimitModel.approveRequest(id, member_limit);
    return res.status(200).json({ status: true, message: result.message });
  } catch (err) {
    console.error("Approve request error:", err);
    return res.status(err.code || 500).json({ status: false, message: err.message });
  }
};

module.exports = {
  sendRequest,
  getAllRequests,
  approveRequest,
};
