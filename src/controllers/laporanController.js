const db = require('../config/db');

// 1. AMBIL SEMUA RIWAYAT LAPORAN (Untuk Tabel di Halaman List)
exports.getAllLaporan = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM laporan ORDER BY created_at DESC');
        res.status(200).json({ status: 'Success', data: rows });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 2. AMBIL DATA DETAIL UNTUK PREVIEW & EXCEL
exports.getLaporanDetail = async (req, res) => {
    const { id } = req.params; 

    try {
        // A. Ambil Data Header PO & Vendor
        const [headerRows] = await db.query(`
            SELECT k.*, v.nama_vendor 
            FROM kegiatan k 
            LEFT JOIN vendor v ON k.vendor_id = v.id 
            WHERE k.no_po = ?
        `, [id]);

        if (headerRows.length === 0) return res.status(404).json({ message: "Data PO tidak ditemukan" });
        const header = headerRows[0];

        // B. Summary Tonase per Transporter
        const [summary] = await db.query(`
            SELECT 
                t.nama_transporter,
                COUNT(bt.id) AS total_ritase,
                (COUNT(bt.id) * 25) AS total_tonase
            FROM kegiatan_transporter kt
            JOIN transporter t ON kt.transporter_id = t.id
            LEFT JOIN keberangkatan_truk bt ON kt.id = bt.kegiatan_transporter_id AND bt.status = 'Valid'
            WHERE kt.kegiatan_id = ?
            GROUP BY t.id
        `, [header.id]);

        // C. LOG REALISASI DETAIL
        const [realisasiDetail] = await db.query(`
            SELECT 
                bt.created_at AS waktu_berangkat, 
                ken.plat_nomor, 
                t.nama_transporter,
                u.nama AS nama_petugas,
                s.nama_shift 
            FROM keberangkatan_truk bt
            JOIN kegiatan_transporter kt ON bt.kegiatan_transporter_id = kt.id
            JOIN transporter t ON kt.transporter_id = t.id
            JOIN kendaraan ken ON bt.kendaraan_id = ken.id
            JOIN users u ON bt.email_user = u.email
            JOIN shift s ON bt.shift_id = s.id 
            WHERE kt.kegiatan_id = ? AND bt.status = 'Valid'
            ORDER BY bt.created_at DESC
        `, [header.id]);

        // D. Daftar Unit Terdaftar
        const [vehicles] = await db.query(`
            SELECT t.nama_transporter, ken.plat_nomor, ken.status AS status_kendaraan
            FROM kegiatan_transporter kt
            JOIN transporter t ON kt.transporter_id = t.id
            JOIN kendaraan ken ON ken.transporter_id = t.id
            WHERE kt.kegiatan_id = ?
            ORDER BY t.nama_transporter ASC
        `, [header.id]);

        res.status(200).json({
            header,
            summary,
            realisasiDetail,
            vehicles
        });

    } catch (error) {
        console.error("Error Detail Laporan:", error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 3. SIMPAN RIWAYAT GENERATE LAPORAN BARU
exports.createLaporan = async (req, res) => {
    const { judul, tipe_laporan, file_path, dibuat_oleh } = req.body;
    try {
        const query = 'INSERT INTO laporan (judul, tipe_laporan, file_path, dibuat_oleh) VALUES (?, ?, ?, ?)';
        const [result] = await db.query(query, [judul, tipe_laporan, file_path, dibuat_oleh]);
        
        res.status(201).json({ 
            status: 'Success', 
            message: 'Riwayat laporan berhasil disimpan',
            id: result.insertId 
        });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 4. HAPUS RIWAYAT LAPORAN
exports.deleteLaporan = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM laporan WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Riwayat laporan tidak ditemukan' });
        }
        res.status(200).json({ status: 'Success', message: 'Riwayat laporan berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 5. AMBIL LAPORAN PERIODIK (UPDATE: Tambah Vendor & Incoterm)
exports.getLaporanPeriodik = async (req, res) => {
    const { start, end } = req.query;

    try {
        // Ambil SEMUA riwayat keberangkatan truk dalam rentang tanggal
        const [logs] = await db.query(`
            SELECT 
                bt.id,
                k.no_po,
                v.nama_vendor,     -- Kolom Vendor
                k.incoterm,        -- Kolom Incoterm
                k.material,
                k.tanggal_mulai,
                k.tanggal_selesai,
                k.quantity AS qty_po, 
                bt.created_at AS waktu_berangkat,
                ken.plat_nomor,
                t.nama_transporter,
                s.nama_shift,
                u.nama AS nama_petugas
            FROM keberangkatan_truk bt
            JOIN kegiatan_transporter kt ON bt.kegiatan_transporter_id = kt.id
            JOIN kegiatan k ON kt.kegiatan_id = k.id
            JOIN vendor v ON k.vendor_id = v.id
            JOIN transporter t ON kt.transporter_id = t.id
            JOIN kendaraan ken ON bt.kendaraan_id = ken.id
            JOIN users u ON bt.email_user = u.email
            JOIN shift s ON bt.shift_id = s.id
            WHERE bt.tanggal BETWEEN ? AND ? AND bt.status = 'Valid'
            ORDER BY bt.created_at ASC
        `, [start, end]);

        // Kalkulasi Ringkasan
        const [summaryMaterial] = await db.query(`
            SELECT 
                k.material, 
                COUNT(bt.id) as total_ritase, 
                SUM(DISTINCT k.quantity) as total_tonase_po 
            FROM keberangkatan_truk bt
            JOIN kegiatan_transporter kt ON bt.kegiatan_transporter_id = kt.id
            JOIN kegiatan k ON kt.kegiatan_id = k.id
            WHERE bt.tanggal BETWEEN ? AND ? AND bt.status = 'Valid'
            GROUP BY k.material
        `, [start, end]);

        res.status(200).json({
            periode: { start, end },
            logs,
            summaryMaterial
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};