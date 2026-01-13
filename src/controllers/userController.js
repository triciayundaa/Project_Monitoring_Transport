const db = require('../config/db');
const bcrypt = require('bcryptjs');

// 1. Mengambil semua pengguna untuk tabel UserList
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT nama, email, no_telp, role FROM users');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data pengguna", error: error.message });
    }
};

// Menambah pengguna baru dengan enkripsi
exports.addUser = async (req, res) => {
    const { nama, email, no_telp, password, role } = req.body;
    try {
        // Hash password sebelum disimpan
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (nama, email, no_telp, password, role) VALUES (?, ?, ?, ?, ?)';
        await db.query(query, [nama, email, no_telp, hashedPassword, role]);
        res.status(201).json({ message: "User berhasil ditambahkan dengan aman" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update data pengguna
exports.updateUser = async (req, res) => {
    const { email } = req.params;
    const { nama, no_telp, role, password } = req.body;

    try {
        let query, params;
        if (password) {
            // Jika admin mengisi password baru, lakukan hash ulang
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET nama = ?, no_telp = ?, role = ?, password = ? WHERE email = ?';
            params = [nama, no_telp, role, hashedPassword, email];
        } else {
            // Jika password kosong, jangan update kolom password
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