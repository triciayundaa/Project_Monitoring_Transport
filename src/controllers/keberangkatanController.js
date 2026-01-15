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

// 1. API BARU: Cek status shift user hari ini
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

// 2. CEK PO
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

// 3. SIMPAN DATA
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

        // C. Deteksi Shift
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

        // F. Simpan Data Truk
        const [result] = await db.query(
            `INSERT INTO keberangkatan_truk 
             (kegiatan_id, kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Valid')`, // Default Status Valid
            [kegiatan_id, kendaraan_id, email_user, finalShiftId, tanggal, no_seri_pengantar, foto_truk, foto_surat]
        );

        // ✅ G. AUTO-UPDATE STATUS KEGIATAN MENJADI "On Progress"
        // Cek status kegiatan saat ini
        const [kegiatanStatus] = await db.query(
            'SELECT status FROM kegiatan WHERE id = ?',
            [kegiatan_id]
        );

        // Jika status masih "Waiting", ubah menjadi "On Progress"
        if (kegiatanStatus.length > 0 && kegiatanStatus[0].status === 'Waiting') {
            await db.query(
                'UPDATE kegiatan SET status = ? WHERE id = ?',
                ['On Progress', kegiatan_id]
            );
            console.log(`✅ Status kegiatan ID ${kegiatan_id} otomatis diubah menjadi "On Progress"`);
        }

        res.status(200).json({ 
            status: 'Success', 
            message: 'Data berhasil disimpan', 
            data: { id: result.insertId } 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 4. GET DATA (Filter Tanggal & User)
const getKeberangkatanByDate = async (req, res) => {
    const { tanggal, email_user } = req.query;

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
             WHERE kt.tanggal = ? AND kt.email_user = ? 
             ORDER BY kt.created_at DESC`,
            [tanggal, email_user]
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

// 5. HAPUS DATA
const hapusKeberangkatan = async (req, res) => {
    const { id } = req.params;
    
    try {
        // A. Ambil kegiatan_id sebelum menghapus
        const [trukData] = await db.query(
            'SELECT kegiatan_id FROM keberangkatan_truk WHERE id = ?',
            [id]
        );

        if (trukData.length === 0) {
            return res.status(404).json({ message: 'Data tidak ditemukan' });
        }

        const kegiatan_id = trukData[0].kegiatan_id;

        // B. Hapus truk
        const [result] = await db.query('DELETE FROM keberangkatan_truk WHERE id = ?', [id]);

        // ✅ C. AUTO-UPDATE STATUS KEGIATAN KEMBALI KE "Waiting" JIKA TIDAK ADA TRUK
        // Hitung sisa truk untuk kegiatan ini
        const [sisaTruk] = await db.query(
            'SELECT COUNT(*) as total FROM keberangkatan_truk WHERE kegiatan_id = ?',
            [kegiatan_id]
        );

        // Jika tidak ada truk lagi, ubah status menjadi "Waiting"
        if (sisaTruk[0].total === 0) {
            await db.query(
                'UPDATE kegiatan SET status = ? WHERE id = ? AND status = ?',
                ['Waiting', kegiatan_id, 'On Progress']
            );
            console.log(`✅ Status kegiatan ID ${kegiatan_id} dikembalikan ke "Waiting" (tidak ada truk)`);
        }

        res.status(200).json({ 
            status: 'Success', 
            message: 'Data berhasil dihapus' 
        });

    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

// 6. VERIFIKASI KEBERANGKATAN (Fitur Baru dari Olivia)
const verifikasiKeberangkatan = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Valid', 'Tolak'].includes(status)) {
            return res.status(400).json({ message: 'Status tidak valid' });
        }

        await db.query(
            'UPDATE keberangkatan_truk SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({ message: 'Status berhasil diperbarui' });
    } catch (err) {
        console.error('VERIFIKASI ERROR:', err);
        res.status(500).json({ message: err.sqlMessage || err.message });
    }
};

module.exports = {
    cekStatusShiftUser,
    cekPO,
    simpanKeberangkatan,
    getKeberangkatanByDate,
    hapusKeberangkatan,
    verifikasiKeberangkatan
};