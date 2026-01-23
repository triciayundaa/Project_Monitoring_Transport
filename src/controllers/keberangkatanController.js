const db = require('../config/db');

// --- HELPER FUNCTIONS ---
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

// --- FUNGSI UTAMA ---

const getOrCreateKegiatanTransporterId = async (kegiatanId, transporterId) => {
    try {
        const [existing] = await db.query(
            'SELECT id FROM kegiatan_transporter WHERE kegiatan_id = ? AND transporter_id = ?',
            [kegiatanId, transporterId]
        );

        if (existing.length > 0) return existing[0].id;

        const [result] = await db.query(
            'INSERT INTO kegiatan_transporter (kegiatan_id, transporter_id, status) VALUES (?, ?, ?)',
            [kegiatanId, transporterId, 'On Progress']
        );
        return result.insertId;
    } catch (error) {
        // Retry logic for race condition
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

// 🔥 FUNGSI INI YANG DIPERBAIKI TOTAL 🔥
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

        const kegiatanId = kegiatan[0].id;

        // 2. Ambil Transporter KHUSUS untuk Kegiatan ini (Filter by PO)
        // Kita Join ke tabel kegiatan_transporter untuk mendapatkan hanya yang ditugaskan
        const [transporters] = await db.query(`
            SELECT t.id, t.nama_transporter 
            FROM transporter t
            JOIN kegiatan_transporter kt ON t.id = kt.transporter_id
            WHERE kt.kegiatan_id = ?
            GROUP BY t.id, t.nama_transporter
            ORDER BY t.nama_transporter ASC
        `, [kegiatanId]);

        // 3. Ambil Kendaraan milik Transporter yang terpilih saja
        let vehicles = [];
        if (transporters.length > 0) {
            const transporterIds = transporters.map(t => t.id);
            // Query kendaraan in list ID
            const [vehicleRows] = await db.query(
                `SELECT id, plat_nomor, transporter_id FROM kendaraan WHERE transporter_id IN (?) ORDER BY plat_nomor ASC`,
                [transporterIds]
            );
            vehicles = vehicleRows;
        }

        // 4. Gabungkan Data (Mapping di JS agar aman dari error SQL JSON)
        const transporterData = transporters.map(t => {
            return {
                id: t.id,
                nama_transporter: t.nama_transporter,
                // Masukkan kendaraan yang sesuai ID transporter-nya
                vehicles: vehicles.filter(v => v.transporter_id === t.id)
            };
        });

        res.status(200).json({ 
            status: 'Success', 
            data: kegiatan[0],
            transporters: transporterData // Data ini sekarang TERFILTER sesuai PO
        });

    } catch (error) {
        console.error("Error Cek PO:", error);
        res.status(500).json({ message: error.message });
    }
};

const simpanKeberangkatan = async (req, res) => {
    const { kegiatan_id, transporter_id, no_polisi, email_user, tanggal, no_seri_pengantar, foto_truk, foto_surat } = req.body;

    console.log("🔥 REQUEST SAVE:", req.body);

    try {
        // Validasi User & Jadwal
        const [users] = await db.query('SELECT nama FROM users WHERE email = ?', [email_user]);
        const [jadwal] = await db.query('SELECT * FROM jadwal_shift WHERE tanggal = ?', [tanggal]);
        
        if (users.length === 0) return res.status(401).json({ message: 'User invalid' });
        if (jadwal.length === 0) return res.status(403).json({ message: 'Jadwal belum tersedia' });

        const userShiftName = detectUserShift(jadwal[0], users[0].nama);
        if (!userShiftName || userShiftName === 'Libur') return res.status(403).json({ message: 'Shift tidak valid / Libur' });

        if (!transporter_id) return res.status(400).json({ message: 'Transporter wajib dipilih!' });

        // 🔥 VALIDASI KETAT: Cek apakah Nopol ini benar milik Transporter yang dipilih?
        // Cari ID kendaraan berdasarkan plat nomor
        const [existingKendaraan] = await db.query('SELECT id, transporter_id FROM kendaraan WHERE plat_nomor = ?', [no_polisi]);
        
        if (existingKendaraan.length === 0) {
            return res.status(400).json({ message: `Nomor Polisi '${no_polisi}' tidak terdaftar di database.` });
        }

        // Cek kesesuaian Transporter
        // (Pastikan transporter_id dari frontend sama dengan pemilik kendaraan di DB)
        // Note: Kita convert ke String biar aman bandinginnya
        if (String(existingKendaraan[0].transporter_id) !== String(transporter_id)) {
             return res.status(400).json({ 
                 message: `Nomor Polisi '${no_polisi}' bukan milik transporter yang dipilih. Mohon cek kembali.` 
             });
        }

        const kendaraanId = existingKendaraan[0].id;

        // Cari ID Shift
        const [mstShift] = await db.query('SELECT id FROM shift WHERE nama_shift = ?', [userShiftName]);
        
        // Dapatkan ID Penghubung
        const finalKegiatanTransporterId = await getOrCreateKegiatanTransporterId(kegiatan_id, transporter_id);
        
        // Simpan Data
        const [result] = await db.query(
            `INSERT INTO keberangkatan_truk 
             (kegiatan_transporter_id, kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Valid')`,
            [finalKegiatanTransporterId, kendaraanId, email_user, mstShift[0].id, tanggal, no_seri_pengantar, foto_truk, foto_surat]
        );

        // Update Status
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
    const { id } = req.params;
    const { nopol, nama_personil, no_seri_pengantar, keterangan, status } = req.body;

    console.log('📝 UPDATE TRUK REQUEST:', { id, body: req.body });

    try {
        if (!nopol || !nama_personil) {
            return res.status(400).json({ message: 'Plat nomor dan nama personil harus diisi' });
        }

        const [existingKendaraan] = await db.query(
            'SELECT id FROM kendaraan WHERE plat_nomor = ?',
            [nopol]
        );

        if (existingKendaraan.length === 0) {
            return res.status(400).json({ 
                message: 'Nomor Polisi tidak terdaftar di sistem master kendaraan.' 
            });
        }
        
        const kendaraanId = existingKendaraan[0].id;

        const [trukData] = await db.query(
            'SELECT email_user FROM keberangkatan_truk WHERE id = ?',
            [id]
        );

        if (trukData.length === 0) {
            return res.status(404).json({ message: 'Data keberangkatan tidak ditemukan' });
        }

        const finalKeterangan = keterangan || '';

        const [updateTrukResult] = await db.query(
            `UPDATE keberangkatan_truk 
             SET kendaraan_id = ?, 
                 no_seri_pengantar = ?, 
                 keterangan = ?, 
                 status = ? 
             WHERE id = ?`,
            [kendaraanId, no_seri_pengantar || '', finalKeterangan, status, id]
        );

        if (updateTrukResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Gagal update, data tidak ditemukan.' });
        }

        console.log('Data truk ID', id, 'berhasil diperbarui');
        
        return res.status(200).json({ 
            message: 'Data berhasil diperbarui',
            data: { id, nopol, nama_personil, status }
        });

    } catch (error) {
        console.error('❌ UPDATE TRUK ERROR:', error);
        return res.status(500).json({ message: error.message });
    }
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