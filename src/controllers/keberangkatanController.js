const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// --- HELPER: GET LOCAL TODAY DATE ---
const getLocalTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- HELPER: CONVERT BASE64 KE FILE ---
const saveBase64ToFile = (base64String, prefix) => {
    if (!base64String || !base64String.includes('base64')) return null;

    try {
        const uploadDir = path.join(__dirname, '../../public/uploads'); 
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            console.error('❌ Invalid Base64 format');
            return null;
        }
        
        const imageBuffer = Buffer.from(matches[2], 'base64');
        
        const fileName = `${prefix}-${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, imageBuffer);
        console.log(`✅ File saved: ${filePath}`);

        return `/uploads/${fileName}`; 
    } catch (error) {
        console.error("❌ Gagal save gambar:", error);
        return null;
    }
};

// --- HELPER: CEK JAM SHIFT ---
const getShiftFromTime = (currentHour) => {
    if (currentHour >= 7 && currentHour < 15) return 'Shift 1';
    if (currentHour >= 15 && currentHour < 23) return 'Shift 2';
    return 'Shift 3'; 
};

// --- HELPER: FORMAT DATE FOR DISPLAY ---
const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

// API 2: CEK PO (DENGAN VALIDASI RENTANG TANGGAL DAN FILTER TRANSPORTER COMPLETE)
const cekPO = async (req, res) => {
    const { no_po } = req.body;
    try {
        const [kegiatan] = await db.query(
            `SELECT k.*, v.nama_vendor FROM kegiatan k LEFT JOIN vendor v ON k.vendor_id = v.id WHERE TRIM(k.no_po) = TRIM(?)`,
            [no_po?.trim()]
        );

        if (kegiatan.length === 0) return res.status(404).json({ status: 'Error', message: 'Nomor PO Tidak Ditemukan' });

        const kegiatanId = kegiatan[0].id;

        // --- VALIDASI RENTANG TANGGAL ---
        const todayStr = getLocalTodayDate(); // YYYY-MM-DD
        
        // Ambil tanggal mulai dan selesai dari data PO
        const poStartDate = String(kegiatan[0].tanggal_mulai).substring(0, 10);
        const poEndDate = String(kegiatan[0].tanggal_selesai).substring(0, 10);

        // Cek apakah hari ini sebelum tanggal mulai
        if (todayStr < poStartDate) {
            return res.status(403).json({ 
                status: 'Error', 
                message: `GAGAL: PO ${kegiatan[0].no_po} dimulai tanggal ${formatDateForDisplay(poStartDate)}. Anda hanya bisa input PO yang dimulai HARI INI (${formatDateForDisplay(todayStr)}) atau sudah berlangsung.` 
            });
        }

        // Cek apakah hari ini setelah tanggal selesai
        if (todayStr > poEndDate) {
            return res.status(403).json({ 
                status: 'Error', 
                message: `GAGAL: PO ${kegiatan[0].no_po} sudah selesai pada tanggal ${formatDateForDisplay(poEndDate)}. Tidak dapat menginput data untuk PO yang sudah berakhir.` 
            });
        }
        // -----------------------------------

        // Ambil semua transporter untuk kegiatan ini
        const [allTransporters] = await db.query(`
            SELECT t.id, t.nama_transporter, kt.id as kegiatan_transporter_id,
            kt.status 
            FROM transporter t
            JOIN kegiatan_transporter kt ON t.id = kt.transporter_id
            WHERE kt.kegiatan_id = ?
            GROUP BY t.id, t.nama_transporter, kt.id, kt.status
            ORDER BY t.nama_transporter ASC
        `, [kegiatanId]);

        if (allTransporters.length === 0) {
            return res.status(200).json({ status: 'Success', data: kegiatan[0], transporters: [] });
        }

        // Cek apakah SEMUA transporter sudah Complete
        const allCompleted = allTransporters.every(t => t.status === 'Completed');
        
        if (allCompleted) {
            return res.status(403).json({ 
                status: 'Error', 
                message: `Kegiatan dengan Nomor PO ${kegiatan[0].no_po} sudah SELESAI. Semua transporter telah menyelesaikan pengiriman. Data tidak dapat ditambah lagi.` 
            });
        }

        // Filter hanya transporter yang statusnya bukan 'Completed'
        const activeTransporters = allTransporters.filter(t => t.status !== 'Completed');

        if (activeTransporters.length === 0) {
            return res.status(403).json({ 
                status: 'Error', 
                message: `Kegiatan dengan Nomor PO ${kegiatan[0].no_po} sudah SELESAI. Semua transporter telah menyelesaikan pengiriman.` 
            });
        }

        // Ambil kendaraan hanya untuk transporter yang aktif
        const activeKTIds = activeTransporters.map(t => t.kegiatan_transporter_id);
        
        let vehicles = [];
        if (activeKTIds.length > 0) {
            const [vehicleRows] = await db.query(`
                SELECT k.id, k.plat_nomor, k.transporter_id
                FROM kendaraan k
                JOIN kegiatan_kendaraan kk ON k.id = kk.kendaraan_id
                WHERE kk.kegiatan_transporter_id IN (?)
                ORDER BY k.plat_nomor ASC
            `, [activeKTIds]);
            vehicles = vehicleRows;
        }

        // Return hanya transporter yang aktif (On Progress atau Waiting)
        const transporterData = activeTransporters.map(t => {
            return {
                id: t.id,
                nama_transporter: t.nama_transporter,
                status: t.status,
                vehicles: vehicles.filter(v => v.transporter_id === t.id)
            };
        });

        res.status(200).json({ 
            status: 'Success', 
            data: kegiatan[0], 
            transporters: transporterData 
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// API 3: SIMPAN DATA
const simpanKeberangkatan = async (req, res) => {
    const { kegiatan_id, transporter_id, no_polisi, email_user, tanggal, no_seri_pengantar, foto_truk, foto_surat } = req.body;

    try {
        // 1. Validasi Tanggal (Server Side - Harus Hari Ini)
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const todayStr = jakartaTime.toISOString().split('T')[0];

        if (tanggal !== todayStr) {
            return res.status(403).json({ message: 'Input hanya diperbolehkan untuk tanggal hari ini.' });
        }

        // 2. Cek Jadwal Shift di DB
        const [jadwal] = await db.query(`
            SELECT s.id as shift_id, s.nama_shift 
            FROM jadwal_shift js JOIN shift s ON js.shift_id = s.id
            WHERE js.tanggal = ? AND js.email_user = ? 
        `, [tanggal, email_user]);
        
        if (jadwal.length === 0) return res.status(403).json({ message: 'Anda tidak memiliki jadwal shift hari ini.' });
        if (jadwal.some(j => j.nama_shift === 'Libur')) return res.status(403).json({ message: 'Anda tidak bisa input data karena jadwal Anda LIBUR.' });

        // 3. Validasi Jam Real-time vs Jadwal
        const currentHour = jakartaTime.getHours();
        const currentShiftScope = getShiftFromTime(currentHour); 
        const matchingShift = jadwal.find(j => j.nama_shift === currentShiftScope);

        if (!matchingShift) {
            const jadwalAnda = jadwal.map(j => j.nama_shift).join(', ');
            return res.status(403).json({ 
                message: `Saat ini adalah waktu ${currentShiftScope}. Anda hanya bisa input sesuai jam shift Anda: ${jadwalAnda}` 
            });
        }

        const userShiftId = matchingShift.shift_id;

        // 4. Proses File
        const fotoTrukPath = saveBase64ToFile(foto_truk, 'truk');
        const fotoSuratPath = saveBase64ToFile(foto_surat, 'surat');

        if (!fotoTrukPath || !fotoSuratPath) {
            return res.status(400).json({ message: 'Gagal memproses foto.' });
        }

        // 5. Validasi Kendaraan & Alokasi
        const [existingKendaraan] = await db.query('SELECT id FROM kendaraan WHERE plat_nomor = ?', [no_polisi]);
        if (existingKendaraan.length === 0) return res.status(400).json({ message: 'Nopol tidak terdaftar.' });
        
        const kendaraanId = existingKendaraan[0].id;
        const finalKegiatanTransporterId = await getOrCreateKegiatanTransporterId(kegiatan_id, transporter_id);

        const [alokasi] = await db.query(
            'SELECT id FROM kegiatan_kendaraan WHERE kegiatan_transporter_id = ? AND kendaraan_id = ?',
            [finalKegiatanTransporterId, kendaraanId]
        );

        if (alokasi.length === 0) {
             return res.status(400).json({ message: 'Truk belum dialokasikan untuk PO ini.' });
        }

        // 6. Insert Data
        const [result] = await db.query(
            `INSERT INTO keberangkatan_truk 
             (kegiatan_kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'Valid')`,
            [alokasi[0].id, email_user, userShiftId, tanggal, no_seri_pengantar, fotoTrukPath, fotoSuratPath]
        );

        await db.query(
            'UPDATE kegiatan_transporter SET status = ? WHERE id = ? AND status = ?', 
            ['On Progress', finalKegiatanTransporterId, 'Waiting']
        );

        res.status(200).json({ status: 'Success', message: 'Data berhasil disimpan', data: { id: result.insertId } });

    } catch (error) {
        console.error('❌ SAVE ERROR:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};


// API MANUAL INPUT
const simpanKeberangkatanManual = async (req, res) => {
    const { 
        kegiatan_id, 
        transporter_id, 
        no_polisi, 
        nama_personil,
        shift_id, 
        tanggal,
        jam,
        no_seri_pengantar, 
        foto_truk,
        foto_surat, 
        keterangan, 
        status 
    } = req.body;

    try {
        console.log('📥 Manual Input Request:', { ...req.body, foto_truk: foto_truk ? 'Base64' : null, foto_surat: foto_surat ? 'Base64' : null });

        // 1. Validasi Input (Foto tidak wajib)
        if (!kegiatan_id || !transporter_id || !no_polisi || !nama_personil || !shift_id || !tanggal || !jam) {
            return res.status(400).json({ 
                message: 'Data wajib belum lengkap (Kegiatan, Transporter, Nopol, Personil, Shift, Waktu).' 
            });
        }

        // 2. Validasi Kendaraan
        const [existingKendaraan] = await db.query('SELECT id FROM kendaraan WHERE plat_nomor = ?', [no_polisi]);
        if (existingKendaraan.length === 0) {
            return res.status(400).json({ message: `Plat nomor ${no_polisi} tidak terdaftar.` });
        }
        
        const kendaraanId = existingKendaraan[0].id;

        // 3. Cari email user
        const [userResult] = await db.query('SELECT email FROM users WHERE nama = ? AND role = ?', [nama_personil, 'personil']);
        const email_user = userResult.length > 0 ? userResult[0].email : 'admin@system.com';

        // 4. Get/Create Kegiatan Transporter
        const finalKegiatanTransporterId = await getOrCreateKegiatanTransporterId(kegiatan_id, transporter_id);

        // 5. Cek/Buat Alokasi Kendaraan
        let alokasiId;
        const [alokasi] = await db.query(
            'SELECT id FROM kegiatan_kendaraan WHERE kegiatan_transporter_id = ? AND kendaraan_id = ?',
            [finalKegiatanTransporterId, kendaraanId]
        );

        if (alokasi.length === 0) {
            const [newAlokasi] = await db.query(
                'INSERT INTO kegiatan_kendaraan (kegiatan_transporter_id, kendaraan_id) VALUES (?, ?)',
                [finalKegiatanTransporterId, kendaraanId]
            );
            alokasiId = newAlokasi.insertId;
        } else {
            alokasiId = alokasi[0].id;
        }

        // 6. Proses Foto (Opsional)
        let fotoTrukPath = null;
        let fotoSuratPath = null;

        if (foto_truk) {
            fotoTrukPath = saveBase64ToFile(foto_truk, 'truk-manual');
        }
        if (foto_surat) {
            fotoSuratPath = saveBase64ToFile(foto_surat, 'surat-manual');
        }

        // 7. Gabungkan tanggal dan jam
        const created_at = `${tanggal} ${jam}:00`;

        // 8. Insert Data
        const finalKeterangan = keterangan || 'Input Manual oleh Admin';
        const finalStatus = status || 'Valid';
        const finalNoSeri = no_seri_pengantar || '-';

        const [result] = await db.query(
            `INSERT INTO keberangkatan_truk 
             (kegiatan_kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat, keterangan, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [alokasiId, email_user, shift_id, tanggal, finalNoSeri, fotoTrukPath, fotoSuratPath, finalKeterangan, finalStatus, created_at]
        );

        // 9. Update Status
        await db.query(
            'UPDATE kegiatan_transporter SET status = ? WHERE id = ? AND status = ?', 
            ['On Progress', finalKegiatanTransporterId, 'Waiting']
        );

        res.status(200).json({ 
            status: 'Success', 
            message: 'Data manual berhasil disimpan', 
            data: { id: result.insertId } 
        });

    } catch (error) {
        console.error('❌ MANUAL SAVE ERROR:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// 🔥 API 4: UPDATE DATA (DENGAN SUPPORT FOTO)
const updateTruk = async (req, res) => {
    const { id } = req.params; 
    const { 
        kegiatan_id, 
        transporter_id, 
        no_polisi, 
        nama_personil,
        shift_id,
        tanggal,
        jam,
        no_seri_pengantar, 
        foto_truk,
        foto_surat,
        keep_existing_truk,
        keep_existing_surat,
        keterangan, 
        status 
    } = req.body;

    try {
        console.log('📝 Update Request for ID:', id);
        console.log('📦 Payload:', { 
            ...req.body, 
            foto_truk: foto_truk ? 'Base64 Data' : null,
            foto_surat: foto_surat ? 'Base64 Data' : null,
            keep_existing_truk,
            keep_existing_surat
        });

        // 1. Get old record
        const [oldRecord] = await db.query(`
            SELECT kbt.foto_truk as old_foto_truk, kbt.foto_surat as old_foto_surat,
                   kk.kegiatan_transporter_id
            FROM keberangkatan_truk kbt
            JOIN kegiatan_kendaraan kk ON kbt.kegiatan_kendaraan_id = kk.id
            WHERE kbt.id = ?`, [id]);

        if (oldRecord.length === 0) {
            return res.status(404).json({ message: 'Data keberangkatan tidak ditemukan.' });
        }
        
        const oldKTId = oldRecord[0].kegiatan_transporter_id;
        const oldFotoTruk = oldRecord[0].old_foto_truk;
        const oldFotoSurat = oldRecord[0].old_foto_surat;

        console.log('📁 Old Record:', { oldFotoTruk, oldFotoSurat, oldKTId });

        // 2. Validate kendaraan
        const [existingKendaraan] = await db.query('SELECT id FROM kendaraan WHERE plat_nomor = ?', [no_polisi]);
        if (existingKendaraan.length === 0) {
            return res.status(400).json({ message: 'Nopol tidak terdaftar.' });
        }
        
        const kendaraanId = existingKendaraan[0].id;
        const finalKegiatanTransporterId = await getOrCreateKegiatanTransporterId(kegiatan_id, transporter_id);

        // 3. Get/Create alokasi
        const [alokasi] = await db.query(
            'SELECT id FROM kegiatan_kendaraan WHERE kegiatan_transporter_id = ? AND kendaraan_id = ?',
            [finalKegiatanTransporterId, kendaraanId]
        );

        let targetId;
        if (alokasi.length === 0) {
            const [ins] = await db.query(
                'INSERT INTO kegiatan_kendaraan (kegiatan_transporter_id, kendaraan_id) VALUES (?, ?)',
                [finalKegiatanTransporterId, kendaraanId]
            );
            targetId = ins.insertId;
        } else {
            targetId = alokasi[0].id;
        }

        // 4. Handle foto updates
        let finalFotoTruk = oldFotoTruk;
        let finalFotoSurat = oldFotoSurat;

        // 🔥 PERBAIKAN LOGIC FOTO TRUK
        if (!keep_existing_truk) {
            console.log('🖼️ User wants to change/remove foto truk');
            
            // Delete old file if exists
            if (oldFotoTruk) {
                const publicDir = path.join(__dirname, '../../public');
                const oldPath = path.join(publicDir, oldFotoTruk);
                if (fs.existsSync(oldPath)) {
                    console.log('🗑️ Deleting old foto truk:', oldPath);
                    fs.unlinkSync(oldPath);
                }
            }
            
            // Save new foto if provided
            if (foto_truk && foto_truk.includes('base64')) {
                console.log('💾 Saving new foto truk');
                finalFotoTruk = saveBase64ToFile(foto_truk, 'truk-edit');
                
                if (!finalFotoTruk) {
                    console.error('❌ Failed to save foto truk!');
                } else {
                    console.log('✅ New foto truk saved:', finalFotoTruk);
                }
            } else {
                console.log('⚠️ No new foto truk provided, setting to null');
                finalFotoTruk = null;
            }
        } else {
            console.log('✅ Keeping existing foto truk:', oldFotoTruk);
        }

        // 🔥 PERBAIKAN LOGIC FOTO SURAT  
        if (!keep_existing_surat) {
            console.log('🖼️ User wants to change/remove foto surat');
            
            // Delete old file if exists
            if (oldFotoSurat) {
                const publicDir = path.join(__dirname, '../../public');
                const oldPath = path.join(publicDir, oldFotoSurat);
                if (fs.existsSync(oldPath)) {
                    console.log('🗑️ Deleting old foto surat:', oldPath);
                    fs.unlinkSync(oldPath);
                }
            }
            
            // Save new foto if provided
            if (foto_surat && foto_surat.includes('base64')) {
                console.log('💾 Saving new foto surat');
                finalFotoSurat = saveBase64ToFile(foto_surat, 'surat-edit');
                
                if (!finalFotoSurat) {
                    console.error('❌ Failed to save foto surat!');
                } else {
                    console.log('✅ New foto surat saved:', finalFotoSurat);
                }
            } else {
                console.log('⚠️ No new foto surat provided, setting to null');
                finalFotoSurat = null;
            }
        } else {
            console.log('✅ Keeping existing foto surat:', oldFotoSurat);
        }

        console.log('📊 Final Foto Values:', {
            finalFotoTruk,
            finalFotoSurat
        });

        // 5. Get user email
        const [userResult] = await db.query('SELECT email FROM users WHERE nama = ? AND role = ?', [nama_personil, 'personil']);
        const email_user = userResult.length > 0 ? userResult[0].email : 'admin@system.com';

        // 6. Combine tanggal and jam for created_at
        const created_at = tanggal && jam ? `${tanggal} ${jam}:00` : null;

        // 7. Update record
        console.log('💾 Updating database with:', {
            targetId,
            email_user,
            shift_id,
            tanggal,
            no_seri_pengantar,
            finalFotoTruk,
            finalFotoSurat,
            keterangan,
            status,
            created_at
        });

        await db.query(
            `UPDATE keberangkatan_truk 
             SET kegiatan_kendaraan_id = ?, 
                 email_user = ?,
                 shift_id = ?,
                 tanggal = ?,
                 no_seri_pengantar = ?, 
                 foto_truk = ?,
                 foto_surat = ?,
                 keterangan = ?, 
                 status = ?,
                 created_at = COALESCE(?, created_at)
             WHERE id = ?`,
            [
                targetId, 
                email_user,
                shift_id,
                tanggal,
                no_seri_pengantar, 
                finalFotoTruk,
                finalFotoSurat,
                keterangan || '', 
                status || 'Valid',
                created_at,
                id
            ]
        );

        // 8. Update status kegiatan_transporter
        await db.query('UPDATE kegiatan_transporter SET status = "On Progress" WHERE id = ?', [finalKegiatanTransporterId]);

        if (oldKTId !== finalKegiatanTransporterId) {
            const [rem] = await db.query(
                'SELECT COUNT(*) as total FROM keberangkatan_truk kt JOIN kegiatan_kendaraan kk ON kt.kegiatan_kendaraan_id = kk.id WHERE kk.kegiatan_transporter_id = ?',
                [oldKTId]
            );
            if (rem[0].total === 0) {
                await db.query('UPDATE kegiatan_transporter SET status = "Waiting" WHERE id = ?', [oldKTId]);
            }
        }

        console.log('✅ Update successful');
        res.status(200).json({ status: 'Success', message: 'Data berhasil diperbarui' });
    } catch (error) {
        console.error('❌ UPDATE ERROR:', error);
        res.status(500).json({ message: error.message });
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
        if ((tanggal || email_user) && all !== 'true') {
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

// API 6: HAPUS DATA
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

// API 7: VERIFIKASI DATA
const verifikasiKeberangkatan = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await db.query('UPDATE keberangkatan_truk SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Status berhasil diperbarui' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};


module.exports = {
    cekStatusShiftUser, 
    cekPO, 
    simpanKeberangkatan, 
    simpanKeberangkatanManual,
    getKeberangkatanByDate,
    hapusKeberangkatan, 
    verifikasiKeberangkatan, 
    updateTruk,
};