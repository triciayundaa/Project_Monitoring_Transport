const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// --- HELPER: CONVERT BASE64 KE FILE ---
const saveBase64ToFile = (base64String, prefix) => {
    if (!base64String || !base64String.includes('base64')) return null;

    try {
        const uploadDir = path.join(__dirname, '../../public/uploads'); 
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;
        
        const imageBuffer = Buffer.from(matches[2], 'base64');
        
        const fileName = `${prefix}-${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, imageBuffer);

        return `/uploads/${fileName}`; 
    } catch (error) {
        console.error("Gagal save gambar:", error);
        return null;
    }
};

// --- HELPER: CEK JAM SHIFT ---
const getShiftFromTime = (currentHour) => {
    if (currentHour >= 7 && currentHour < 15) return 'Shift 1';
    if (currentHour >= 15 && currentHour < 23) return 'Shift 2';
    return 'Shift 3'; 
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
        const [retry] = await db.query(
            'SELECT id FROM kegiatan_transporter WHERE kegiatan_id = ? AND transporter_id = ?',
            [kegiatanId, transporterId]
        );
        if (retry.length > 0) return retry[0].id;
        throw error;
    }
};

// API 1: CEK STATUS SHIFT
const cekStatusShiftUser = async (req, res) => {
    const { email, tanggal } = req.query;
    try {
        const [users] = await db.query('SELECT nama FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.json({ shift: 'Unknown' });
        
        const [jadwal] = await db.query(`
            SELECT s.nama_shift 
            FROM jadwal_shift js
            JOIN shift s ON js.shift_id = s.id
            WHERE js.tanggal = ? AND js.email_user = ?
        `, [tanggal, email]);

        if (jadwal.length === 0) {
            return res.json({ status: 'Success', data: { nama: users[0].nama, shift: 'Tidak Terdaftar' } });
        }

        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const currentHour = jakartaTime.getHours();
        const currentShiftScope = getShiftFromTime(currentHour); 

        const activeShift = jadwal.find(j => j.nama_shift === currentShiftScope);

        if (activeShift) {
            res.json({ status: 'Success', data: { nama: users[0].nama, shift: activeShift.nama_shift } });
        } else {
            // Fallback Info Only
            const shiftOrder = { 'Shift 1': 1, 'Shift 2': 2, 'Shift 3': 3, 'Libur': 4 };
            jadwal.sort((a, b) => shiftOrder[a.nama_shift] - shiftOrder[b.nama_shift]);
            let selectedFallback = (currentHour >= 12) ? jadwal[jadwal.length - 1] : jadwal[0];
            
            res.json({ 
                status: 'Success', 
                data: { 
                    nama: users[0].nama, 
                    shift: selectedFallback.nama_shift,
                    warning: `Jadwal Anda: ${jadwal.map(j=>j.nama_shift).join(', ')}`
                } 
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// API 2: CEK PO
const cekPO = async (req, res) => {
    const { no_po } = req.body;
    try {
        const [kegiatan] = await db.query(
            `SELECT k.*, v.nama_vendor FROM kegiatan k LEFT JOIN vendor v ON k.vendor_id = v.id WHERE TRIM(k.no_po) = TRIM(?)`,
            [no_po?.trim()]
        );

        if (kegiatan.length === 0) return res.status(404).json({ status: 'Error', message: 'Nomor PO Tidak Ditemukan' });

        const kegiatanId = kegiatan[0].id;

        const [transporters] = await db.query(`
            SELECT t.id, t.nama_transporter, kt.id as kegiatan_transporter_id 
            FROM transporter t
            JOIN kegiatan_transporter kt ON t.id = kt.transporter_id
            WHERE kt.kegiatan_id = ?
            GROUP BY t.id, t.nama_transporter, kt.id
            ORDER BY t.nama_transporter ASC
        `, [kegiatanId]);

        if (transporters.length === 0) {
            return res.status(200).json({ status: 'Success', data: kegiatan[0], transporters: [] });
        }

        const kegiatanTransporterIds = transporters.map(t => t.kegiatan_transporter_id);
        
        let vehicles = [];
        if (kegiatanTransporterIds.length > 0) {
            const [vehicleRows] = await db.query(`
                SELECT k.id, k.plat_nomor, k.transporter_id
                FROM kendaraan k
                JOIN kegiatan_kendaraan kk ON k.id = kk.kendaraan_id
                WHERE kk.kegiatan_transporter_id IN (?)
                ORDER BY k.plat_nomor ASC
            `, [kegiatanTransporterIds]);
            vehicles = vehicleRows;
        }

        const transporterData = transporters.map(t => {
            return {
                id: t.id,
                nama_transporter: t.nama_transporter,
                vehicles: vehicles.filter(v => v.transporter_id === t.id)
            };
        });

        res.status(200).json({ status: 'Success', data: kegiatan[0], transporters: transporterData });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 🔥 API 3: SIMPAN DATA (VALIDASI SHIFT DIPERKETAT) 🔥
const simpanKeberangkatan = async (req, res) => {
    const { kegiatan_id, transporter_id, no_polisi, email_user, tanggal, no_seri_pengantar, foto_truk, foto_surat } = req.body;

    try {
        // 1. Validasi User & Jadwal
        const [users] = await db.query('SELECT nama FROM users WHERE email = ?', [email_user]);
        if (users.length === 0) return res.status(401).json({ message: 'User invalid' });

        const [jadwal] = await db.query(`
            SELECT s.id as shift_id, s.nama_shift 
            FROM jadwal_shift js JOIN shift s ON js.shift_id = s.id
            WHERE js.tanggal = ? AND js.email_user = ? LIMIT 1
        `, [tanggal, email_user]);
        
        if (jadwal.length === 0) return res.status(403).json({ message: 'Tidak ada jadwal shift pada tanggal ini.' });
        
        // Cek Libur
        if (jadwal[0].nama_shift === 'Libur') return res.status(403).json({ message: 'Anda tidak bisa input data karena jadwal Anda LIBUR.' });

        // 🛑 VALIDASI JAM SERVER (AGAR TIDAK BISA INPUT DI LUAR JAM SHIFT)
        const scheduledShift = jadwal[0].nama_shift; // Jadwal User (Misal: Shift 1)
        
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const currentHour = jakartaTime.getHours();
        
        // Pastikan input dilakukan di tanggal yang sama (mencegah backdate/future date di luar shift)
        const serverDateStr = jakartaTime.toISOString().split('T')[0];
        if (tanggal !== serverDateStr) {
             return res.status(403).json({ message: 'Input data hanya diperbolehkan untuk tanggal hari ini.' });
        }

        const currentRealShift = getShiftFromTime(currentHour); // Shift Aktual berdasarkan jam (Misal: Shift 2)

        // Bandingkan: Jika Jadwal User BEDA dengan Shift Sekarang -> TOLAK
        if (scheduledShift !== currentRealShift) {
            return res.status(403).json({ 
                message: `GAGAL: Jadwal Anda ${scheduledShift}, tapi sekarang jam ${currentHour}:00 (${currentRealShift}). Anda hanya bisa input sesuai jam shift.` 
            });
        }
        // 🛑 END VALIDASI

        const userShiftId = jadwal[0].shift_id;

        // 2. PROSES FOTO
        const fotoTrukPath = saveBase64ToFile(foto_truk, 'truk');
        const fotoSuratPath = saveBase64ToFile(foto_surat, 'surat');

        if (!fotoTrukPath || !fotoSuratPath) {
            return res.status(400).json({ message: 'Gagal memproses foto. Pastikan foto diambil dengan benar.' });
        }

        // 3. Validasi & Relasi Kendaraan
        const [existingKendaraan] = await db.query('SELECT id, transporter_id FROM kendaraan WHERE plat_nomor = ?', [no_polisi]);
        if (existingKendaraan.length === 0) return res.status(400).json({ message: 'Nopol tidak terdaftar.' });
        
        const kendaraanId = existingKendaraan[0].id;
        const finalKegiatanTransporterId = await getOrCreateKegiatanTransporterId(kegiatan_id, transporter_id);

        const [alokasi] = await db.query(
            'SELECT id FROM kegiatan_kendaraan WHERE kegiatan_transporter_id = ? AND kendaraan_id = ?',
            [finalKegiatanTransporterId, kendaraanId]
        );

        let kegiatanKendaraanId;
        if (alokasi.length === 0) {
             return res.status(400).json({ message: 'Truk belum dialokasikan untuk PO ini.' });
        } else {
            kegiatanKendaraanId = alokasi[0].id;
        }

        // 4. INSERT DATA
        const [result] = await db.query(
            `INSERT INTO keberangkatan_truk 
             (kegiatan_kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Valid')`,
            [kegiatanKendaraanId, email_user, userShiftId, tanggal, no_seri_pengantar, fotoTrukPath, fotoSuratPath]
        );

        await db.query(
            'UPDATE kegiatan_transporter SET status = ? WHERE id = ? AND status = ?', 
            ['On Progress', finalKegiatanTransporterId, 'Waiting']
        );

        res.status(200).json({ status: 'Success', message: 'Data berhasil disimpan', data: { id: result.insertId } });

    } catch (error) {
        console.error('❌ SAVE ERROR:', error);
        res.status(500).json({ status: 'Error', message: error.sqlMessage || error.message });
    }
};

// API 4: UPDATE DATA (EDIT)
const updateTruk = async (req, res) => {
    const { id } = req.params; // ID dari tabel keberangkatan_truk
    const { kegiatan_id, transporter_id, no_polisi, no_seri_pengantar, keterangan, status } = req.body;

    try {
        // 1. Ambil data lama sebelum diupdate untuk sinkronisasi status nantinya
        const [oldRecord] = await db.query(`
            SELECT kk.kegiatan_transporter_id
            FROM keberangkatan_truk kbt
            JOIN kegiatan_kendaraan kk ON kbt.kegiatan_kendaraan_id = kk.id
            WHERE kbt.id = ?`, [id]);

        if (oldRecord.length === 0) return res.status(404).json({ message: 'Data keberangkatan tidak ditemukan.' });
        const oldKTId = oldRecord[0].kegiatan_transporter_id;

        // 2. Validasi apakah Nopol ada di Master Tabel Kendaraan
        const [existingKendaraan] = await db.query('SELECT id FROM kendaraan WHERE plat_nomor = ?', [no_polisi]);
        if (existingKendaraan.length === 0) return res.status(400).json({ message: 'Nopol ini tidak terdaftar di sistem master kendaraan.' });
        
        const kendaraanId = existingKendaraan[0].id;

        // 3. Cari atau Buat relasi kegiatan_transporter_id
        const finalKegiatanTransporterId = await getOrCreateKegiatanTransporterId(kegiatan_id, transporter_id);

        // 4. LOGIKA PENTING: Cari atau BUAT OTOMATIS alokasi di kegiatan_kendaraan
        // Ini solusi agar tidak muncul error "Nopol tidak terdaftar" jika truk baru dipindah ke PO ini
        const [alokasi] = await db.query(
            'SELECT id FROM kegiatan_kendaraan WHERE kegiatan_transporter_id = ? AND kendaraan_id = ?',
            [finalKegiatanTransporterId, kendaraanId]
        );

        let targetKegiatanKendaraanId;
        if (alokasi.length === 0) {
            // Jika belum dialokasikan di PO ini, kita buatkan otomatis barisnya agar tersimpan ke database baru
            const [insertAlokasi] = await db.query(
                'INSERT INTO kegiatan_kendaraan (kegiatan_transporter_id, kendaraan_id) VALUES (?, ?)',
                [finalKegiatanTransporterId, kendaraanId]
            );
            targetKegiatanKendaraanId = insertAlokasi.insertId;
        } else {
            targetKegiatanKendaraanId = alokasi[0].id;
        }

        // 5. Update Data Utama di keberangkatan_truk
        await db.query(
            `UPDATE keberangkatan_truk 
             SET kegiatan_kendaraan_id = ?, no_seri_pengantar = ?, keterangan = ?, status = ?
             WHERE id = ?`,
            [targetKegiatanKendaraanId, no_seri_pengantar, keterangan || '', status || 'Valid', id]
        );

        // 6. Sinkronisasi Status Transporter Baru jadi 'On Progress'
        await db.query(
            'UPDATE kegiatan_transporter SET status = "On Progress" WHERE id = ?',
            [finalKegiatanTransporterId]
        );

        // 7. Sinkronisasi Status Transporter Lama (Jika truk terakhir dipindah, balikkan ke 'Waiting')
        if (oldKTId !== finalKegiatanTransporterId) {
            const [remainingTrucks] = await db.query(`
                SELECT COUNT(*) as total 
                FROM keberangkatan_truk kbt
                JOIN kegiatan_kendaraan kk ON kbt.kegiatan_kendaraan_id = kk.id
                WHERE kk.kegiatan_transporter_id = ?`, [oldKTId]);

            if (remainingTrucks[0].total === 0) {
                await db.query('UPDATE kegiatan_transporter SET status = "Waiting" WHERE id = ?', [oldKTId]);
            }
        }

        res.status(200).json({ status: 'Success', message: 'Data berhasil diperbarui dan status disinkronkan' });

    } catch (error) {
        console.error('❌ UPDATE ERROR:', error);
        res.status(500).json({ status: 'Error', message: 'Gagal memperbarui data: ' + error.message });
    }
};
// API 5: GET DATA
const getKeberangkatanByDate = async (req, res) => {
    const { tanggal, email_user, all } = req.query;
    try {
        let query = `
            SELECT 
                kt.id, kt.tanggal, kt.created_at, kt.status, kt.no_seri_pengantar, kt.keterangan, 
                kt.foto_truk, kt.foto_surat,
                kd.plat_nomor, tr.id as transporter_id, tr.nama_transporter as nama_vendor, 
                k.id as kegiatan_id, k.no_po, k.material, k.nama_kapal,
                v.nama_vendor as vendor_po, u.nama as nama_personil, s.nama_shift
            FROM keberangkatan_truk kt
            JOIN kegiatan_kendaraan kk ON kt.kegiatan_kendaraan_id = kk.id
            JOIN kendaraan kd ON kk.kendaraan_id = kd.id
            JOIN kegiatan_transporter ktrans ON kk.kegiatan_transporter_id = ktrans.id
            JOIN transporter tr ON ktrans.transporter_id = tr.id
            JOIN kegiatan k ON ktrans.kegiatan_id = k.id
            LEFT JOIN vendor v ON k.vendor_id = v.id
            LEFT JOIN users u ON kt.email_user = u.email
            LEFT JOIN shift s ON kt.shift_id = s.id
        `;
        
        const params = [];
        const conditions = [];
        const shouldFilter = (tanggal || email_user) && all !== 'true';
        
        if (shouldFilter) {
            if (tanggal) { conditions.push('kt.tanggal = ?'); params.push(tanggal); }
            if (email_user) { conditions.push('kt.email_user = ?'); params.push(email_user); }
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY kt.created_at DESC';
        const [data] = await db.query(query, params);
        res.status(200).json({ status: 'Success', data: data });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

const hapusKeberangkatan = async (req, res) => {
    const { id } = req.params;
    try {
        const [data] = await db.query('SELECT foto_truk, foto_surat FROM keberangkatan_truk WHERE id = ?', [id]);
        await db.query('DELETE FROM keberangkatan_truk WHERE id = ?', [id]);
        
        if (data.length > 0) {
            const publicDir = path.join(__dirname, '../../public');
            if (data[0].foto_truk) {
                const p = path.join(publicDir, data[0].foto_truk);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
            if (data[0].foto_surat) {
                const p = path.join(publicDir, data[0].foto_surat);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
        }

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

module.exports = {
    cekStatusShiftUser, cekPO, simpanKeberangkatan, getKeberangkatanByDate,
    hapusKeberangkatan, verifikasiKeberangkatan, updateTruk
};