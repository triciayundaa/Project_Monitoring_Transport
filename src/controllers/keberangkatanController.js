const db = require('../config/db');

const SHIFT_RULES = {
    'Shift 1': { start: 7, end: 15 },   // 07:00 - 15:00
    'Shift 2': { start: 15, end: 23 },  // 15:00 - 23:00
    'Shift 3': { start: 23, end: 7 }    // 23:00 - 07:00
};

// --- Helper: Deteksi Shift User ---
const detectUserShift = (jadwalRow, namaPersonil) => {
    // Normalisasi string (hapus spasi depan/belakang)
    const nama = namaPersonil.trim().toLowerCase();
    
    if (jadwalRow.shift1?.trim().toLowerCase() === nama) return 'Shift 1';
    if (jadwalRow.shift2?.trim().toLowerCase() === nama) return 'Shift 2';
    if (jadwalRow.shift3?.trim().toLowerCase() === nama) return 'Shift 3';
    if (jadwalRow.libur?.trim().toLowerCase() === nama) return 'Libur';
    return null; // Tidak ada jadwal
};

// 1. API BARU: Untuk mengecek status shift user hari ini (Dipakai di Header Frontend)
const cekStatusShiftUser = async (req, res) => {
    const { email, tanggal } = req.query;

    try {
        // Cari Nama
        const [users] = await db.query('SELECT nama FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.json({ shift: 'Unknown', status: 'User tidak ditemukan' });
        const namaPersonil = users[0].nama;

        // Cari Jadwal
        const [jadwal] = await db.query('SELECT * FROM jadwal_shift WHERE tanggal = ?', [tanggal]);
        
        if (jadwal.length === 0) return res.json({ shift: 'Belum Diatur', status: 'No Data' });

        const userShift = detectUserShift(jadwal[0], namaPersonil);

        res.json({
            status: 'Success',
            data: {
                nama: namaPersonil,
                shift: userShift || 'Tidak Terdaftar'
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 2. CEK PO (Tidak Berubah)
const cekPO = async (req, res) => {
    const { no_po } = req.body;
    try {
        const noPoTrimmed = no_po ? no_po.trim() : '';
        if (!noPoTrimmed) return res.status(400).json({ status: 'Error', message: 'Nomor PO kosong' });

        const [kegiatan] = await db.query(
            `SELECT k.*, v.nama_vendor FROM kegiatan k LEFT JOIN vendor v ON k.vendor_id = v.id WHERE TRIM(k.no_po) = TRIM(?)`,
            [noPoTrimmed]
        );

        if (kegiatan.length > 0) res.status(200).json({ status: 'Success', data: kegiatan[0] });
        else res.status(404).json({ status: 'Error', message: 'Nomor PO Tidak Ditemukan' });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 3. SIMPAN DATA (Perbaikan Validasi)
const simpanKeberangkatan = async (req, res) => {
    const { kegiatan_id, no_polisi, email_user, tanggal, no_seri_pengantar, foto_truk, foto_surat } = req.body;

    try {
        // A. Validasi User
        const [users] = await db.query('SELECT nama FROM users WHERE email = ?', [email_user]);
        if (users.length === 0) return res.status(401).json({ status: 'Error', message: 'User invalid' });
        const namaPersonil = users[0].nama;

        // B. Validasi Jadwal
        const [jadwalHarian] = await db.query('SELECT * FROM jadwal_shift WHERE tanggal = ?', [tanggal]);
        if (jadwalHarian.length === 0) return res.status(403).json({ status: 'Error', message: 'Jadwal tanggal ini belum tersedia.' });

        // C. Deteksi Shift (Pakai Helper yang lebih ketat)
        const userShiftName = detectUserShift(jadwalHarian[0], namaPersonil);

        if (!userShiftName) return res.status(403).json({ status: 'Error', message: `Nama Anda (${namaPersonil}) tidak terdaftar di jadwal hari ini.` });
        if (userShiftName === 'Libur') return res.status(403).json({ status: 'Error', message: 'Anda sedang jadwal LIBUR.' });

        // D. Validasi Jam Kerja
        const now = new Date();
        const currentHour = now.getHours();
        const rule = SHIFT_RULES[userShiftName];
        let isValidTime = false;

        if (userShiftName === 'Shift 3') {
            if (currentHour >= rule.start || currentHour < rule.end) isValidTime = true;
        } else {
            if (currentHour >= rule.start && currentHour < rule.end) isValidTime = true;
        }

        // DEBUGGING DI SERVER CONSOLE (Cek ini di terminal VS Code kalau masih lolos)
        console.log(`[VALIDASI] User: ${namaPersonil}, Shift: ${userShiftName}, Jam: ${currentHour}, Valid: ${isValidTime}`);

        if (!isValidTime) {
            return res.status(403).json({ 
                status: 'Error', 
                message: `Maaf bukan jadwal shift anda. Sekarang jam ${currentHour}:00, jadwal ${userShiftName} adalah jam ${rule.start}:00 - ${rule.end}:00.` 
            });
        }

        // E. Ambil ID Referensi
        const [mstShift] = await db.query('SELECT id FROM shift WHERE nama_shift = ?', [userShiftName]);
        const finalShiftId = mstShift[0].id;

        const [kendaraan] = await db.query('SELECT id FROM kendaraan WHERE plat_nomor = ?', [no_polisi]);
        if (kendaraan.length === 0) return res.status(404).json({ status: 'Error', message: 'Nomor polisi tidak terdaftar' });
        const kendaraan_id = kendaraan[0].id;

        // F. Simpan
        const [result] = await db.query(
            `INSERT INTO keberangkatan_truk 
             (kegiatan_id, kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [kegiatan_id, kendaraan_id, email_user, finalShiftId, tanggal, no_seri_pengantar, foto_truk, foto_surat]
        );

        res.status(200).json({ status: 'Success', message: 'Data berhasil disimpan', data: { id: result.insertId } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// ... (getKeberangkatanByDate dan hapusKeberangkatan biarkan sama) ...
// Ambil data keberangkatan (Filter Tanggal & User)
const getKeberangkatanByDate = async (req, res) => {
    const { tanggal, email_user } = req.query; // Ambil email dari parameter

    // Validasi input
    if (!tanggal || !email_user) {
        return res.status(400).json({ 
            status: 'Error', 
            message: 'Parameter tanggal dan email_user diperlukan' 
        });
    }

    try {
        const [data] = await db.query(
            `SELECT kt.*, 
                    k.no_po, 
                    k.transporter, 
                    k.material, 
                    k.nama_kapal, 
                    v.nama_vendor, 
                    kd.plat_nomor, 
                    u.nama as nama_personil, 
                    s.nama_shift
             FROM keberangkatan_truk kt
             LEFT JOIN kegiatan k ON kt.kegiatan_id = k.id
             LEFT JOIN vendor v ON k.vendor_id = v.id
             LEFT JOIN kendaraan kd ON kt.kendaraan_id = kd.id
             LEFT JOIN users u ON kt.email_user = u.email
             LEFT JOIN shift s ON kt.shift_id = s.id
             WHERE kt.tanggal = ? AND kt.email_user = ?  -- FILTER TAMBAHAN DI SINI
             ORDER BY kt.created_at DESC`,
            [tanggal, email_user] // Masukkan parameter ke query
        );

        res.status(200).json({
            status: 'Success',
            data: data
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'Error', 
            message: error.message 
        });
    }
};

const hapusKeberangkatan = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM keberangkatan_truk WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Data tidak ditemukan' });
        res.status(200).json({ status: 'Success', message: 'Data berhasil dihapus' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
    cekStatusShiftUser, // <--- JANGAN LUPA EXPORT INI
    cekPO,
    simpanKeberangkatan,
    getKeberangkatanByDate,
    hapusKeberangkatan
};