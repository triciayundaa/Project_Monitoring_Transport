const db = require('../config/db');

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Query mencari user berdasarkan email dan password
        const [users] = await db.query(
            'SELECT email, nama, role FROM users WHERE email = ? AND password = ?', 
            [email, password]
        );

        if (users.length > 0) {
            res.status(200).json({
                status: 'Success',
                message: 'Login Berhasil',
                user: users[0]
            });
        } else {
            res.status(401).json({
                status: 'Error',
                message: 'Email atau password salah'
            });
        }
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

module.exports = { loginUser };