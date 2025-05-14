const express = require('express');
const router = express.Router();
const { sendRequest, getAllRequests, approveRequest } = require('../controllers/grouplimitController');

router.post('/send', sendRequest);
router.get('/all', getAllRequests);
router.post('/approve', approveRequest);

module.exports = router;
