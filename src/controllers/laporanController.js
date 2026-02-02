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
            LEFT JOIN kegiatan_kendaraan kk ON kt.id = kk.kegiatan_transporter_id
            LEFT JOIN keberangkatan_truk bt ON kk.id = bt.kegiatan_kendaraan_id AND bt.status = 'Valid'
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
            JOIN kegiatan_kendaraan kk ON bt.kegiatan_kendaraan_id = kk.id
            JOIN kegiatan_transporter kt ON kk.kegiatan_transporter_id = kt.id
            JOIN transporter t ON kt.transporter_id = t.id
            JOIN kendaraan ken ON kk.kendaraan_id = ken.id
            JOIN users u ON bt.email_user = u.email
            JOIN shift s ON bt.shift_id = s.id 
            WHERE kt.kegiatan_id = ? AND bt.status = 'Valid'
            ORDER BY bt.created_at DESC
        `, [header.id]);

        // D. Daftar Unit Terdaftar
        const [vehicles] = await db.query(`
            SELECT t.nama_transporter, ken.plat_nomor, ken.status AS status_kendaraan
            FROM kegiatan_kendaraan kk
            JOIN kegiatan_transporter kt ON kk.kegiatan_transporter_id = kt.id
            JOIN transporter t ON kt.transporter_id = t.id
            JOIN kendaraan ken ON kk.kendaraan_id = ken.id
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

// 3. SIMPAN RIWAYAT GENERATE LAPORAN BARU (FIXED: SINKRONISASI 5 JENIS FILTER)
exports.createLaporan = async (req, res) => {
    const { judul, tipe_laporan, file_path, dibuat_oleh } = req.body;
    try {
        // Logika backend tetap menerima string tipe dari frontend agar sinkron dengan 5 filter
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

// 5. AMBIL LAPORAN PERIODIK (Data Kegiatan + Daftar Transporter)
exports.getLaporanPeriodik = async (req, res) => {
    const { start, end } = req.query;

    try {
        const [logs] = await db.query(`
            SELECT 
                k.id,
                k.no_po,
                v.nama_vendor,
                k.nama_kapal,
                k.material,
                k.incoterm,
                k.no_bl,
                k.quantity,
                k.tanggal_mulai,
                k.tanggal_selesai,
                k.created_at,
                (
                    SELECT GROUP_CONCAT(DISTINCT t.nama_transporter SEPARATOR ', ')
                    FROM kegiatan_transporter kt
                    JOIN transporter t ON kt.transporter_id = t.id
                    WHERE kt.kegiatan_id = k.id
                ) AS daftar_transporter
            FROM kegiatan k
            LEFT JOIN vendor v ON k.vendor_id = v.id
            WHERE k.tanggal_mulai BETWEEN ? AND ?
            ORDER BY k.material ASC, k.tanggal_mulai ASC
        `, [start, end]);

        const [summaryMaterial] = await db.query(`
            SELECT 
                k.material, 
                COUNT(DISTINCT k.no_po) as total_po, 
                SUM(k.quantity) as total_tonase_qty 
            FROM kegiatan k
            WHERE k.tanggal_mulai BETWEEN ? AND ?
            GROUP BY k.material
        `, [start, end]);

        res.status(200).json({
            periode: { start, end },
            logs,
            summaryMaterial
        });
    } catch (error) {
        console.error("Error Laporan Periodik:", error.message);
        res.status(500).json({ message: error.message });
    }
};