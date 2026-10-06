const express = require('express');
const router = express.Router();
const { 
  getBoutiqueById, 
  getAllBoutiques, 
  getMyBoutique, 
  submitBoutiqueKyc,
  updateVisitingCard,
} = require('../controllers/boutiqueController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getAllBoutiques);
router.get('/me', protect, authorize('boutique_owner'), getMyBoutique);
router.put('/kyc', protect, authorize('boutique_owner'), submitBoutiqueKyc);
router.put('/visiting-card', protect, authorize('boutique_owner'), updateVisitingCard);
router.get('/:id', getBoutiqueById);

module.exports = router;
