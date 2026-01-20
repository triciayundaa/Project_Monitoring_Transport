const db = require('../config/db');

const SHIFT_RULES = {
    'Shift 1': { start: 7, end: 15 },
    'Shift 2': { start: 15, end: 23 },
    'Shift 3': { start: 23, end: 7 }
};

const detectUserShift = (jadwalRow, namaPersonil) => {
    const nama = namaPersonil.trim().toLowerCase();
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 7 && currentHour < 15) {
        if (jadwalRow.shift1?.trim().toLowerCase() === nama) return 'Shift 1';
    } else if (currentHour >= 15 && currentHour < 23) {
        if (jadwalRow.shift2?.trim().toLowerCase() === nama) return 'Shift 2';
    } else {
        if (jadwalRow.shift3?.trim().toLowerCase() === nama) return 'Shift 3';
    }

    if (jadwalRow.shift1?.trim().toLowerCase() === nama) return 'Shift 1';
    if (jadwalRow.shift2?.trim().toLowerCase() === nama) return 'Shift 2';
    if (jadwalRow.shift3?.trim().toLowerCase() === nama) return 'Shift 3';
    if (jadwalRow.libur?.trim().toLowerCase() === nama) return 'Libur';
    return null;
};

// --- FUNGSI PENGHUBUNG (KEGIATAN-TRANSPORTER) ---
const getOrCreateKegiatanTransporterId = async (kegiatanId, transporterId) => {
    try {
        // Cek apakah hubungan sudah ada
        const [existing] = await db.query(
            'SELECT id FROM kegiatan_transporter WHERE kegiatan_id = ? AND transporter_id = ?',
            [kegiatanId, transporterId]
        );

        if (existing.length > 0) {
            return existing[0].id;
        }

        // Jika belum, buat baru
        const [result] = await db.query(
            'INSERT INTO kegiatan_transporter (kegiatan_id, transporter_id, status) VALUES (?, ?, ?)',
            [kegiatanId, transporterId, 'On Progress']
        );
        return result.insertId;

    } catch (error) {
        // Retry jika race condition
        const [retry] = await db.query(
            'SELECT id FROM kegiatan_transporter WHERE kegiatan_id = ? AND transporter_id = ?',
            [kegiatanId, transporterId]
        );
        if (retry.length > 0) return retry[0].id;
        throw error;
    }
};

const cekStatusShiftUser = async (req, res) => {
    const { email, tanggal } = req.query;
    try {
        const [users] = await db.query('SELECT nama FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.json({ shift: 'Unknown' });
        
        const [jadwal] = await db.query('SELECT * FROM jadwal_shift WHERE tanggal = ?', [tanggal]);
        if (jadwal.length === 0) return res.json({ shift: 'Belum Diatur' });

        const userShift = detectUserShift(jadwal[0], users[0].nama);
        res.json({ status: 'Success', data: { nama: users[0].nama, shift: userShift || 'Tidak Terdaftar' } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const cekPO = async (req, res) => {
    const { no_po } = req.body;
    try {
        // 1. Ambil Data Kegiatan
        const [kegiatan] = await db.query(
            `SELECT k.*, v.nama_vendor FROM kegiatan k LEFT JOIN vendor v ON k.vendor_id = v.id WHERE TRIM(k.no_po) = TRIM(?)`,
            [no_po?.trim()]
        );

        if (kegiatan.length === 0) {
            return res.status(404).json({ status: 'Error', message: 'Nomor PO Tidak Ditemukan' });
        }

        // 2. Ambil Daftar Transporter (Untuk Dropdown di Frontend)
        // Kita ambil SEMUA transporter agar personil bisa memilih
        const [transporters] = await db.query('SELECT id, nama_transporter FROM transporter ORDER BY nama_transporter ASC');

        res.status(200).json({ 
            status: 'Success', 
            data: kegiatan[0],
            transporters: transporters // Kirim list transporter ke frontend
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const simpanKeberangkatan = async (req, res) => {
    // TAMBAHAN: terima transporter_id dari frontend
    const { kegiatan_id, transporter_id, no_polisi, email_user, tanggal, no_seri_pengantar, foto_truk, foto_surat } = req.body;

    console.log("🔥 REQUEST SAVE:", req.body);

    try {
        // A. Validasi
        const [users] = await db.query('SELECT nama FROM users WHERE email = ?', [email_user]);
        const [jadwal] = await db.query('SELECT * FROM jadwal_shift WHERE tanggal = ?', [tanggal]);
        
        if (users.length === 0) return res.status(401).json({ message: 'User invalid' });
        if (jadwal.length === 0) return res.status(403).json({ message: 'Jadwal belum tersedia' });

        const userShiftName = detectUserShift(jadwal[0], users[0].nama);
        if (!userShiftName || userShiftName === 'Libur') return res.status(403).json({ message: 'Shift tidak valid / Libur' });

        if (!transporter_id) return res.status(400).json({ message: 'Transporter wajib dipilih!' });

        // B. Validasi Nomor Polisi - HARUS SUDAH TERDAFTAR DI DATABASE
        const [existingKendaraan] = await db.query('SELECT id FROM kendaraan WHERE plat_nomor = ?', [no_polisi]);
        
        if (existingKendaraan.length === 0) {
            return res.status(400).json({ message: `Nomor Polisi '${no_polisi}' tidak terdaftar di database. Silakan hubungi admin untuk mendaftarkan kendaraan.` });
        }

        const kendaraanId = existingKendaraan[0].id;

        // C. Cari ID Shift
        const [mstShift] = await db.query('SELECT id FROM shift WHERE nama_shift = ?', [userShiftName]);
        
        // D. DAPATKAN ID PENGHUBUNG (KEGIATAN_TRANSPORTER)
        const finalKegiatanTransporterId = await getOrCreateKegiatanTransporterId(kegiatan_id, transporter_id);
        
        // E. Simpan Data
        const [result] = await db.query(
            `INSERT INTO keberangkatan_truk 
             (kegiatan_transporter_id, kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Valid')`,
            [finalKegiatanTransporterId, kendaraanId, email_user, mstShift[0].id, tanggal, no_seri_pengantar, foto_truk, foto_surat]
        );

        // F. Update Status (FIXED: Update di tabel kegiatan_transporter, BUKAN kegiatan)
        await db.query(
            'UPDATE kegiatan_transporter SET status = ? WHERE id = ? AND status = ?', 
            ['On Progress', finalKegiatanTransporterId, 'Waiting']
        );

        res.status(200).json({ status: 'Success', message: 'Data berhasil disimpan', data: { id: result.insertId } });

    } catch (error) {
        console.error('❌ FATAL ERROR SAVE:', error);
        res.status(500).json({ status: 'Error', message: error.sqlMessage || error.message });
    }
};

// ... (Sisa fungsi getKeberangkatanByDate, hapus, verifikasi, updateTruk TETAP SAMA, tidak perlu diubah) ...
const getKeberangkatanByDate = async (req, res) => {
    const { tanggal, email_user } = req.query;
    console.log("📥 GET DATA - tanggal:", tanggal, "email_user:", email_user);
    try {
        const [data] = await db.query(
            `SELECT kt.*, k.no_po, k.material, k.nama_kapal, v.nama_vendor, kd.plat_nomor, u.nama as nama_personil, s.nama_shift, tr.nama_transporter as transporter
             FROM keberangkatan_truk kt
             LEFT JOIN kegiatan_transporter kt_link ON kt.kegiatan_transporter_id = kt_link.id
             LEFT JOIN kegiatan k ON kt_link.kegiatan_id = k.id
             LEFT JOIN transporter tr ON kt_link.transporter_id = tr.id
             LEFT JOIN vendor v ON k.vendor_id = v.id
             LEFT JOIN kendaraan kd ON kt.kendaraan_id = kd.id
             LEFT JOIN users u ON kt.email_user = u.email
             LEFT JOIN shift s ON kt.shift_id = s.id
             WHERE kt.tanggal = ? AND kt.email_user = ? 
             ORDER BY kt.created_at DESC`,
            [tanggal, email_user]
        );
        console.log("✅ DATA FOUND:", data.length, "records");
        res.status(200).json({ status: 'Success', data: data });
    } catch (error) {
        console.error("❌ GET DATA ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

const hapusKeberangkatan = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM keberangkatan_truk WHERE id = ?', [id]);
        res.status(200).json({ status: 'Success', message: 'Data berhasil dihapus' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const verifikasiKeberangkatan = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await db.query('UPDATE keberangkatan_truk SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Status berhasil diperbarui' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateTruk = async (req, res) => {
    res.status(501).json({message: "Fitur update belum disesuaikan"});
};

module.exports = {
    cekStatusShiftUser,
    cekPO,
    simpanKeberangkatan,
    getKeberangkatanByDate,
    hapusKeberangkatan,
    verifikasiKeberangkatan,
    updateTruk
};