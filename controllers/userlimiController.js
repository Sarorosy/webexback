const userlimitModel = require('../models/userlimiModel');
const db = require('../db');


const sendRequest = async (req, res) => {
  const { sender_id, group_id, user_ids, requested_at } = req.body;

  if (!sender_id || !group_id || !Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ status:false, message: "sender_id, group_id, and non-empty user_ids array are required" });
  }

  try {
    const result = await userlimitModel.sendRequests(sender_id, group_id, user_ids, requested_at || new Date());
    res.status(200).json({ status:true, message: "Requests sent successfully", result });
  } catch (err) {
    console.error("Send request error:", err);
    res.status(500).json({ status:false, message: "Server error", error: err });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await userlimitModel.getAllRequests();
    res.status(200).json({ requests });
  } catch (err) {
    console.error("Fetch requests error:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

const approveRequest = async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ status: false, message: "Request ID is required" });

  try {
    const result = await userlimitModel.approveRequest(id);
    return res.status(200).json({ status: true, message: result.message });
  } catch (err) {
    const statusCode = err.code === 404 || err.code === 400 ? err.code : 500;
    return res.status(statusCode).json({ status: false, message: err.message || "Server error" });
  }
};

module.exports = {
  sendRequest,
  getAllRequests,
  approveRequest
};
