const express = require('express');
const {
  getPackages,
  getAllPackages,
  createPackage,
  updatePackage,
  deletePackage
} = require('../controllers/packageController');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');

const router = express.Router();

// Public / Member route to list active packages
router.get('/', getPackages);

// Admin routes to manage package catalog
router.get('/all', verifyToken, verifyAdmin, getAllPackages);
router.post('/', verifyToken, verifyAdmin, createPackage);
router.put('/:id', verifyToken, verifyAdmin, updatePackage);
router.delete('/:id', verifyToken, verifyAdmin, deletePackage);

module.exports = router;
