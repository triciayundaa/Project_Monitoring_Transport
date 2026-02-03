const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Mengambil semua pengguna (Ditambahkan kolom password untuk fitur password lama)
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT nama, email, no_telp, role, password FROM users');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data pengguna", error: error.message });
    }
};

// Menambah pengguna baru dengan validasi ketat
exports.addUser = async (req, res) => {
    const { nama, email, no_telp, password, role } = req.body;

    // VALIDASI BACKEND
    if (!nama || !email || !no_telp || !password || !role) {
        return res.status(400).json({ message: "Semua field wajib diisi!" });
    }
    const validRoles = ['admin', 'personil', 'patroler'];
if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Role tidak valid!" });
}
    if (!/^\d+$/.test(no_telp) || no_telp.length > 15) {
        return res.status(400).json({ message: "Nomor telepon harus angka dan maksimal 15 digit!" });
    }
    if (!/^(?=.*[A-Z]).{12,}$/.test(password)) {
        return res.status(400).json({ message: "Password minimal 12 karakter dengan 1 huruf kapital!" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (nama, email, no_telp, password, role) VALUES (?, ?, ?, ?, ?)';
        await db.query(query, [nama, email, no_telp, hashedPassword, role]);
        res.status(201).json({ message: "User berhasil ditambahkan dengan aman" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }

};

// Update data pengguna (Validasi untuk no_telp dan password baru jika diisi)
exports.updateUser = async (req, res) => {
    const { email } = req.params;
    const { nama, no_telp, role, password } = req.body;

    // VALIDASI NO TELP SAAT UPDATE
    if (no_telp && (!/^\d+$/.test(no_telp) || no_telp.length > 15)) {
        return res.status(400).json({ message: "Nomor telepon harus angka dan maksimal 15 digit!" });
    }

    try {
        let query, params;
        if (password) {
            // Validasi password baru jika diinputkan
            if (!/^(?=.*[A-Z]).{12,}$/.test(password)) {
                return res.status(400).json({ message: "Password baru minimal 12 karakter dengan 1 huruf kapital!" });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET nama = ?, no_telp = ?, role = ?, password = ? WHERE email = ?';
            params = [nama, no_telp, role, hashedPassword, email];
        } else {
            query = 'UPDATE users SET nama = ?, no_telp = ?, role = ? WHERE email = ?';
            params = [nama, no_telp, role, email];
        }
        await db.query(query, params);
        res.status(200).json({ message: "Data berhasil diperbarui" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Hapus pengguna
exports.deleteUser = async (req, res) => {
    const { email } = req.params;
    try {
        await db.query('DELETE FROM users WHERE email = ?', [email]);
        res.status(200).json({ message: "Pengguna berhasil dihapus" });
    } catch (error) {
        res.status(500).json({ message: "Gagal menghapus pengguna", error: error.message });
    }
};