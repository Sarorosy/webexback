const express = require("express");
const {
    getAllMilestones,
    getMilestoneById,
    createMilestone,
    updateMilestone,
    deleteMilestone
} = require("../controllers/milestoneController");

const router = express.Router();

// Get all milestones
router.get("/milestones", getAllMilestones);

// Get milestone by ID
router.get("/milestone/:id", getMilestoneById);

// Create a new milestone
router.post("/milestone", createMilestone);

// Update a milestone
router.put("/milestone", updateMilestone);

// Soft delete a milestone
router.delete("/milestone/:id", deleteMilestone);

module.exports = router;
