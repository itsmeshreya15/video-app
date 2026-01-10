const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
    getCategories,
    createCategory,
    deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

router.use(protect); // All routes are protected

router.route('/')
    .get(getCategories)
    .post(authorize('editor', 'admin'), createCategory);

router.route('/:id')
    .delete(authorize('editor', 'admin'), deleteCategory);

module.exports = router;
