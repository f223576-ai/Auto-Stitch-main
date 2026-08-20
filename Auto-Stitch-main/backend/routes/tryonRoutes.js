 
const express = require('express');
const router = express.Router();
const { generateTryOn } = require('../controllers/tryonController');
 
router.post('/generate', generateTryOn);
 
module.exports = router;
 
