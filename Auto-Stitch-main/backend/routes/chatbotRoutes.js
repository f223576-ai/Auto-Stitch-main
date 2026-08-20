const express = require('express');
const router = express.Router();
const { getChatbotResponse } = require('../controllers/chatbotController');
const { chatbotLimiter } = require('../middleware/rateLimiter');
const { optionalAuth } = require('../middleware/authMiddleware');

router.post('/', chatbotLimiter, optionalAuth, getChatbotResponse);

module.exports = router;