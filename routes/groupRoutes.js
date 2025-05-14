const express = require("express");
const {
    createGroup,
    getGroupById,
    updateGroup,
    getAllGroups,
    addMember,
    addMembers,
    getGroupMembers,
    removeMember,
    deleteGroupHandler
} = require("../controllers/groupController");

const router = express.Router();

router.post("/create", createGroup);
router.get("/all", getAllGroups);
router.get("/group/:id", getGroupById);
router.post("/update", updateGroup);
router.post("/add-member", addMember);
router.post("/add-members", addMembers);

router.get("/members/:group_id", getGroupMembers);
router.post("/remove-member", removeMember);

router.post("/delete", deleteGroupHandler);


module.exports = router;
