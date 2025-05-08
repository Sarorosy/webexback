const express = require("express");
const {
    createGroup,
    getGroupById,
    getAllGroups,
    addMember,
    getGroupMembers,
    removeMember
} = require("../controllers/groupController");

const router = express.Router();

router.post("/create", createGroup);
router.get("/all", getAllGroups);
router.get("/group/:id", getGroupById);
router.post("/add-member", addMember);
router.get("/members/:group_id", getGroupMembers);
router.post("/remove-member", removeMember);

module.exports = router;
