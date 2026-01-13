const db = require('../config/db');
const bcrypt = require('bcryptjs');

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Cari user berdasarkan email saja
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length > 0) {
            const user = users[0];
            
            // 2. Bandingkan password input dengan hash di database
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                res.status(200).json({
                    status: 'Success',
                    message: 'Login Berhasil',
                    user: { email: user.email, nama: user.nama, role: user.role }
                });
            } else {
                res.status(401).json({ status: 'Error', message: 'Password salah' });
            }
        } else {
            res.status(401).json({ status: 'Error', message: 'Email tidak ditemukan' });
        }
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

module.exports = { loginUser };