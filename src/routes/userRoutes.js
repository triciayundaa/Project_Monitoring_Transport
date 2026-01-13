const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Endpoint: http://localhost:3000/api/users
router.get('/', userController.getAllUsers);
router.post('/add', userController.addUser);
router.put('/:email', userController.updateUser);
router.delete('/:email', userController.deleteUser);

module.exports = router;