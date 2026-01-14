const db = require('../config/db');

// 1. Ambil Semua Laporan
exports.getAllLaporan = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM laporan ORDER BY created_at DESC');
        res.status(200).json({ status: 'Success', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 2. Ambil Detail Laporan
exports.getLaporanById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM laporan WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Laporan tidak ditemukan' });
        res.status(200).json({ status: 'Success', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Tambah Laporan Baru
exports.createLaporan = async (req, res) => {
    const { judul, tipe_laporan, file_path, dibuat_oleh } = req.body;
    try {
        await db.query(
            'INSERT INTO laporan (judul, tipe_laporan, file_path, dibuat_oleh) VALUES (?, ?, ?, ?)',
            [judul, tipe_laporan, file_path, dibuat_oleh]
        );
        res.status(201).json({ status: 'Success', message: 'Laporan berhasil ditambahkan' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Hapus Laporan
exports.deleteLaporan = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM laporan WHERE id = ?', [id]);
        res.status(200).json({ status: 'Success', message: 'Laporan berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};