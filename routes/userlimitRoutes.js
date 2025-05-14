const express = require('express');
const router = express.Router();
const { sendRequest, getAllRequests,approveRequest } = require('../controllers/userlimiController');

router.post('/send', sendRequest);
router.post('/approve', approveRequest);
router.get('/all', getAllRequests);

module.exports = router;
