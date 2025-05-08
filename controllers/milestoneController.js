const milestoneModel = require("../models/milestoneModel");

// Get all milestones
const getAllMilestones = (req, res) => {
    milestoneModel.getAllMilestones((err, milestones) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        res.json({ status: true, data: milestones });
    });
};

// Get milestone by ID
const getMilestoneById = (req, res) => {
    const { id } = req.params;
    milestoneModel.getMilestoneById(id, (err, milestone) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        if (!milestone) return res.status(404).json({ status: false, message: "Milestone not found" });
        res.json({ status: true, data: milestone });
    });
};

// Create a new milestone
const createMilestone = (req, res) => {
    const { milestone_name, fld_addedon, status } = req.body;
    if (!milestone_name || !status) {
        return res.status(400).json({ status: false, message: "Milestone name and status are required" });
    }

    milestoneModel.createMilestone({ milestone_name, fld_addedon, status }, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Failed to create milestone" });
        res.json({ status: true, message: "Milestone created successfully" });
    });
};

// Update an existing milestone
const updateMilestone = (req, res) => {
    const { id, milestone_name, fld_addedon, status } = req.body;
    milestoneModel.updateMilestone(id, { milestone_name, fld_addedon, status }, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        if (result.affectedRows === 0) return res.status(404).json({ status: false, message: "Milestone not found" });
        res.json({ status: true, message: "Milestone updated successfully" });
    });
};

// Delete a milestone (soft delete)
const deleteMilestone = (req, res) => {
    const { id } = req.params;
    milestoneModel.deleteMilestone(id, (err, result) => {
        if (err) return res.status(500).json({ status: false, message: "Database error" });
        if (result.affectedRows === 0) return res.status(404).json({ status: false, message: "Milestone not found" });
        res.json({ status: true, message: "Milestone deleted successfully" });
    });
};

module.exports = {
    getAllMilestones,
    getMilestoneById,
    createMilestone,
    updateMilestone,
    deleteMilestone
};
