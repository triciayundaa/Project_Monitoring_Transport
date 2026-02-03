const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// ============================================
// HELPER: PROCESS SINGLE PHOTO (BASE64 TO FILE)
// ============================================
const processSinglePhoto = (base64String, prefix) => {
    if (!base64String || typeof base64String !== 'string') return null;
    
    // If it's already a path (not base64), return as is (edit case)
    if (!base64String.includes('base64')) {
        return base64String.includes('/uploads/') 
            ? `/uploads/${base64String.split('/uploads/')[1]}` 
            : base64String;
    }

    try {
        const uploadDir = path.join(__dirname, '../../public/uploads'); 
        if (!fs.existsSync(uploadDir)) { 
            fs.mkdirSync(uploadDir, { recursive: true }); 
        }
        
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;
        
        const imageBuffer = Buffer.from(matches[2], 'base64');
        const fileName = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`; 
        const filePath = path.join(uploadDir, fileName);
        
        fs.writeFileSync(filePath, imageBuffer);
        return `/uploads/${fileName}`; 
    } catch (error) {
        console.error("❌ Failed to save image:", error);
        return null;
    }
};

// ============================================
// 1. GET LIST TRUK AIR - FOR WEB DASHBOARD
// ============================================
const getListTrukAir = async (req, res) => {
    try {
        console.log('🔍 Fetching list truk air...');
        
        // Query only fetches kegiatan_transporter that ALREADY HAS cleaning reports
        const query = `
            SELECT 
                kt.id,
                kt.kegiatan_id,
                kt.transporter_id,
                kt.status,
                k.no_po,
                k.nama_kapal,
                k.material,
                k.tanggal_mulai,
                k.tanggal_selesai,
                k.quantity,
                k.incoterm,
                k.no_bl,
                v.nama_vendor,
                t.nama_transporter,
                COUNT(DISTINCT pj.id) as total_laporan,
                MAX(pj.created_at) as last_update
            FROM kegiatan_transporter kt
            JOIN kegiatan k ON kt.kegiatan_id = k.id
            LEFT JOIN vendor v ON k.vendor_id = v.id
            LEFT JOIN transporter t ON kt.transporter_id = t.id
            INNER JOIN pembersihan_jalan pj ON kt.id = pj.kegiatan_transporter_id
            GROUP BY kt.id, kt.kegiatan_id, kt.transporter_id, kt.status,
                      k.no_po, k.nama_kapal, k.material, k.tanggal_mulai, 
                      k.tanggal_selesai, k.quantity, k.incoterm, k.no_bl,
                      v.nama_vendor, t.nama_transporter
            HAVING total_laporan > 0
            ORDER BY last_update DESC, k.no_po, t.nama_transporter
        `;

        const [rows] = await db.query(query);

        // Calculate total water trucks for each row
        const dataWithTrukCount = await Promise.all(rows.map(async (row) => {
            const [trukCount] = await db.query(`
                SELECT 
                    COUNT(DISTINCT pt.plat_nomor) as total_truk_air,
                    GROUP_CONCAT(DISTINCT pt.plat_nomor SEPARATOR ',') as plat_nomor_truk_air
                FROM pembersihan_jalan pj
                LEFT JOIN pembersihan_truk pt ON pj.id = pt.pembersihan_id
                WHERE pj.kegiatan_transporter_id = ?
            `, [row.id]);

            return {
                ...row,
                total_truk_air: trukCount[0].total_truk_air || 0,
                plat_nomor_truk_air: trukCount[0].plat_nomor_truk_air || ''
            };
        }));

        console.log(`✅ Found ${dataWithTrukCount.length} kegiatan_transporter with cleaning reports`);

        res.status(200).json({
            status: 'Success',
            data: dataWithTrukCount
        });

    } catch (error) {
        console.error('❌ Error in getListTrukAir:', error);
        res.status(500).json({
            status: 'Error',
            message: error.message
        });
    }
};

// ============================================
// 2. GET DATA PEMBERSIHAN - FOR MOBILE PATROLER
// ============================================
const getDataPembersihan = async (req, res) => {
    const { email_patroler, tanggal } = req.query;
    
    try {
        console.log(`🔍 Fetching data pembersihan for ${email_patroler} on ${tanggal || 'all dates'}`);
        
        let query = `
            SELECT pj.*, 
                   k.no_po, 
                   k.nama_kapal,
                   k.material,
                   k.tanggal_mulai,
                   k.tanggal_selesai,
                   t.nama_transporter as nama_vendor, 
                   u.nama as nama_patroler,
                   kt.id as kegiatan_transporter_id
            FROM pembersihan_jalan pj
            LEFT JOIN kegiatan_transporter kt ON pj.kegiatan_transporter_id = kt.id 
            LEFT JOIN kegiatan k ON kt.kegiatan_id = k.id
            LEFT JOIN transporter t ON kt.transporter_id = t.id
            LEFT JOIN users u ON pj.email_patroler = u.email
        `;
        
        const params = [];
        const conditions = [];

        if (email_patroler) { 
            conditions.push('pj.email_patroler = ?'); 
            params.push(email_patroler); 
        }
        
        if (tanggal) { 
            conditions.push('DATE(pj.created_at) = ?'); 
            params.push(tanggal); 
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY pj.created_at DESC';

        const [headers] = await db.query(query, params);

        console.log(`📊 Raw headers fetched: ${headers.length}`);

        // Fetch Truck Details & Photos for each header
        const dataLengkap = await Promise.all(headers.map(async (item) => {
            const [trukList] = await db.query(
                'SELECT * FROM pembersihan_truk WHERE pembersihan_id = ?', 
                [item.id]
            );
            
            const [fotoList] = await db.query(
                'SELECT * FROM pembersihan_foto WHERE pembersihan_id = ?', 
                [item.id]
            );

            // Group photos by stage
            const fotoSebelum = fotoList.filter(f => f.tahap === 'sebelum').map(f => f.foto_path);
            const fotoSedang = fotoList.filter(f => f.tahap === 'sedang').map(f => f.foto_path);
            const fotoSetelah = fotoList.filter(f => f.tahap === 'setelah').map(f => f.foto_path);

            // Get metadata from the first photo of each stage
            const dataSblm = fotoList.find(f => f.tahap === 'sebelum');
            const dataSdg = fotoList.find(f => f.tahap === 'sedang');
            const dataStlh = fotoList.find(f => f.tahap === 'setelah');

            return {
                ...item,
                list_truk: trukList,
                list_foto: fotoList,
                
                plat_nomor_truk_air: trukList.map(t => t.plat_nomor).join(', '),
                foto_truk_air: trukList.map(t => t.foto_truk).join(','),
                
                foto_sebelum: fotoSebelum.join(','),
                foto_sedang: fotoSedang.join(','),
                foto_setelah: fotoSetelah.join(','),

                jam_foto_sebelum: dataSblm ? dataSblm.jam_foto : null,
                lokasi_foto_sebelum: dataSblm ? dataSblm.lokasi_foto : null,

                jam_foto_sedang: dataSdg ? dataSdg.jam_foto : null,
                lokasi_foto_sedang: dataSdg ? dataSdg.lokasi_foto : null,

                jam_foto_setelah: dataStlh ? dataStlh.jam_foto : null,
                lokasi_foto_setelah: dataStlh ? dataStlh.lokasi_foto : null,
            };
        }));

        console.log(`✅ Found ${dataLengkap.length} pembersihan records`);

        res.status(200).json({ 
            status: 'Success', 
            data: dataLengkap 
        });
        
    } catch (error) {
        console.error('❌ Error in getDataPembersihan:', error);
        res.status(500).json({ 
            status: 'Error', 
            message: error.message 
        }); 
    }
};

// ============================================
// 3. GET DETAIL SINGLE PEMBERSIHAN - FOR EDIT
// ============================================
const getDetailPembersihan = async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log(`🔍 Fetching detail pembersihan ID: ${id}`);
        
        const query = `
            SELECT pj.*, 
                   k.no_po, k.nama_kapal, k.material,
                   t.nama_transporter, 
                   u.nama as nama_patroler, 
                   u.email as email_patroler
            FROM pembersihan_jalan pj
            LEFT JOIN kegiatan_transporter kt ON pj.kegiatan_transporter_id = kt.id 
            LEFT JOIN kegiatan k ON kt.kegiatan_id = k.id
            LEFT JOIN transporter t ON kt.transporter_id = t.id
            LEFT JOIN users u ON pj.email_patroler = u.email
            WHERE pj.id = ?
        `;
        
        const [rows] = await db.query(query, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ 
                status: 'Error', 
                message: 'Data tidak ditemukan' 
            });
        }

        const data = rows[0];

        const [trukList] = await db.query(
            'SELECT * FROM pembersihan_truk WHERE pembersihan_id = ?', 
            [id]
        );
        
        const [fotoList] = await db.query(
            'SELECT * FROM pembersihan_foto WHERE pembersihan_id = ?', 
            [id]
        );

        const formattedData = {
            ...data,
            detail_truk: trukList,
            foto_sebelum_list: fotoList.filter(f => f.tahap === 'sebelum'),
            foto_sedang_list: fotoList.filter(f => f.tahap === 'sedang'),
            foto_setelah_list: fotoList.filter(f => f.tahap === 'setelah'),
            lokasi_sebelum: fotoList.find(f => f.tahap === 'sebelum')?.lokasi_foto || null,
            lokasi_sedang: fotoList.find(f => f.tahap === 'sedang')?.lokasi_foto || null,
            lokasi_setelah: fotoList.find(f => f.tahap === 'setelah')?.lokasi_foto || null,
        };

        console.log(`✅ Detail pembersihan ID ${id} retrieved`);

        res.status(200).json({ 
            status: 'Success', 
            data: formattedData 
        });
        
    } catch (error) {
        console.error('❌ Error in getDetailPembersihan:', error);
        res.status(500).json({ 
            status: 'Error', 
            message: error.message 
        });
    }
};

// ============================================
// 4. GET DETAIL WATER TRUCK - FOR WEB DASHBOARD
// ============================================
const getDetailWaterTruck = async (req, res) => {
    const { id } = req.params;
    
    try {
        console.log('📥 Fetching detail for kegiatan_transporter_id:', id);
        
        const [ktRows] = await db.query(`
            SELECT 
                kt.id as kegiatan_transporter_id,
                kt.kegiatan_id,
                kt.transporter_id,
                kt.status as status_kegiatan_transporter,
                t.nama_transporter,
                k.no_po,
                k.nama_kapal,
                k.material,
                k.tanggal_mulai,
                k.tanggal_selesai,
                k.quantity,
                k.incoterm,
                k.no_bl,
                v.nama_vendor
            FROM kegiatan_transporter kt
            JOIN kegiatan k ON kt.kegiatan_id = k.id
            LEFT JOIN vendor v ON k.vendor_id = v.id
            LEFT JOIN transporter t ON kt.transporter_id = t.id
            WHERE kt.id = ?
        `, [id]);

        if (ktRows.length === 0) {
            return res.status(404).json({ 
                status: 'Error',
                message: 'Data kegiatan transporter tidak ditemukan' 
            });
        }

        const ktData = ktRows[0];
        const kegiatanId = ktData.kegiatan_id;

        const [allTransportersRows] = await db.query(`
            SELECT DISTINCT
                kt.id,
                t.nama_transporter,
                kt.status
            FROM kegiatan_transporter kt
            LEFT JOIN transporter t ON kt.transporter_id = t.id
            INNER JOIN pembersihan_jalan pj ON kt.id = pj.kegiatan_transporter_id
            WHERE kt.kegiatan_id = ?
            ORDER BY t.nama_transporter
        `, [kegiatanId]);

        const [laporanHeaderRows] = await db.query(`
            SELECT 
                pj.id,
                pj.kegiatan_transporter_id,
                pj.email_patroler,
                pj.status,
                pj.created_at,
                u.nama AS nama_patroler,
                u.email AS email_patroler,
                u.no_telp AS telp_patroler,
                t.nama_transporter
            FROM pembersihan_jalan pj
            LEFT JOIN users u ON pj.email_patroler = u.email
            LEFT JOIN kegiatan_transporter kt ON pj.kegiatan_transporter_id = kt.id
            LEFT JOIN transporter t ON kt.transporter_id = t.id
            WHERE kt.kegiatan_id = ?
            ORDER BY pj.created_at DESC
        `, [kegiatanId]);

        const laporanLengkap = await Promise.all(laporanHeaderRows.map(async (lap) => {
            const [trukList] = await db.query(
                'SELECT * FROM pembersihan_truk WHERE pembersihan_id = ?', 
                [lap.id]
            );
            
            const [fotoList] = await db.query(
                'SELECT * FROM pembersihan_foto WHERE pembersihan_id = ?', 
                [lap.id]
            );

            const fotoSebelum = fotoList.filter(f => f.tahap === 'sebelum').map(f => f.foto_path);
            const fotoSedang = fotoList.filter(f => f.tahap === 'sedang').map(f => f.foto_path);
            const fotoSetelah = fotoList.filter(f => f.tahap === 'setelah').map(f => f.foto_path);

            const dataSblm = fotoList.find(f => f.tahap === 'sebelum');
            const dataSdg = fotoList.find(f => f.tahap === 'sedang');
            const dataStlh = fotoList.find(f => f.tahap === 'setelah');

            return {
                ...lap,
                plat_nomor_truk_air: trukList.map(t => t.plat_nomor).join(', '),
                foto_truk_air: trukList.map(t => t.foto_truk).join(','),
                
                foto_sebelum: fotoSebelum.join(','),
                foto_sedang: fotoSedang.join(','),
                foto_setelah: fotoSetelah.join(','),

                jam_foto_sebelum: dataSblm ? dataSblm.jam_foto : null,
                lokasi_foto_sebelum: dataSblm ? dataSblm.lokasi_foto : null,

                jam_foto_sedang: dataSdg ? dataSdg.jam_foto : null,
                lokasi_foto_sedang: dataSdg ? dataSdg.lokasi_foto : null,

                jam_foto_setelah: dataStlh ? dataStlh.jam_foto : null,
                lokasi_foto_setelah: dataStlh ? dataStlh.lokasi_foto : null,
            };
        }));

        const response = {
            status: 'Success',
            data: {
                kegiatan: {
                    id: kegiatanId,
                    no_po: ktData.no_po,
                    nama_kapal: ktData.nama_kapal,
                    material: ktData.material,
                    tanggal_mulai: ktData.tanggal_mulai,
                    tanggal_selesai: ktData.tanggal_selesai,
                    quantity: ktData.quantity,
                    incoterm: ktData.incoterm,
                    no_bl: ktData.no_bl,
                    nama_vendor: ktData.nama_vendor
                },
                transporter: ktData.nama_transporter,
                transporters: allTransportersRows.map(t => ({
                    id: t.id,
                    nama_transporter: t.nama_transporter,
                    status: t.status
                })),
                laporan: laporanLengkap
            }
        };

        console.log('✅ Response structure:', {
            kegiatan_id: kegiatanId,
            no_po: ktData.no_po,
            total_transporters: allTransportersRows.length,
            total_laporan: laporanLengkap.length
        });

        res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ Error in getDetailWaterTruck:', error);
        res.status(500).json({ 
            status: 'Error',
            message: error.message 
        });
    }
};

// ============================================
// 5. SAVE (INSERT / UPDATE) - WITH TRANSACTION
// ============================================
const simpanPembersihan = async (req, res) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const { 
            id, 
            kegiatan_id,  // This is actually kegiatan_transporter_id
            email_patroler, 
            detail_truk, 
            foto_sebelum_list, 
            foto_sedang_list, 
            foto_setelah_list,
            lokasi_sebelum, 
            lokasi_sedang, 
            lokasi_setelah 
        } = req.body;

        console.log(`💾 === SAVING PEMBERSIHAN ===`);
        console.log(`📧 Patroler: ${email_patroler}`);
        console.log(`🆔 Pembersihan ID: ${id || 'NEW'}`);
        
        // VALIDATION
        if (!kegiatan_id) {
            await connection.rollback();
            return res.status(400).json({ 
                status: 'Error',
                message: "Kegiatan Transporter ID tidak boleh kosong!" 
            });
        }

        const [ktCheck] = await connection.query(
            'SELECT id FROM kegiatan_transporter WHERE id = ?', 
            [kegiatan_id]
        );
        
        if (ktCheck.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                status: 'Error',
                message: `Kegiatan Transporter ID ${kegiatan_id} tidak ditemukan!` 
            });
        }

        const [userCheck] = await connection.query(
            'SELECT role FROM users WHERE email = ?', 
            [email_patroler]
        );
        
        if (userCheck.length === 0 || userCheck[0].role !== 'patroler') {
            await connection.rollback();
            return res.status(403).json({ 
                status: 'Error',
                message: "Access Denied! User bukan patroler atau tidak ditemukan." 
            });
        }

        const isSblm = foto_sebelum_list && foto_sebelum_list.length > 0;
        const isSdg = foto_sedang_list && foto_sedang_list.length > 0;
        const isStlh = foto_setelah_list && foto_setelah_list.length > 0;
        const statusLaporan = (isSblm && isSdg && isStlh) ? 'Completed' : 'Draft';

        let pembersihanId = id;

        // --- STEP A: HEADER ---
        if (pembersihanId) {
            await connection.query(
                `UPDATE pembersihan_jalan SET status = ? WHERE id = ?`,
                [statusLaporan, pembersihanId]
            );
            await connection.query('DELETE FROM pembersihan_truk WHERE pembersihan_id = ?', [pembersihanId]);
            await connection.query('DELETE FROM pembersihan_foto WHERE pembersihan_id = ?', [pembersihanId]);
        } else {
            const [resInsert] = await connection.query(
                `INSERT INTO pembersihan_jalan (kegiatan_transporter_id, email_patroler, status) 
                 VALUES (?, ?, ?)`,
                [kegiatan_id, email_patroler, statusLaporan]
            );
            pembersihanId = resInsert.insertId;
        }

        // --- STEP B: TRUCK DETAILS ---
        if (detail_truk && Array.isArray(detail_truk)) {
            for (let i = 0; i < detail_truk.length; i++) {
                const truk = detail_truk[i];
                const fotoUrl = processSinglePhoto(truk.foto, `truk-${i}`);
                
                if (truk.plat) {
                    await connection.query(
                        `INSERT INTO pembersihan_truk (pembersihan_id, plat_nomor, foto_truk) 
                         VALUES (?, ?, ?)`,
                        [pembersihanId, truk.plat, fotoUrl]
                    );
                }
            }
        }

        // --- STEP C: PHOTOS ---
        const insertFoto = async (list, tahap, lokasi) => {
            if (!list || !Array.isArray(list) || list.length === 0) return;
            
            for (let i = 0; i < list.length; i++) {
                const fotoRaw = list[i];
                const url = processSinglePhoto(fotoRaw, `${tahap}-${i}`);
                
                if (url) {
                    await connection.query(
                        `INSERT INTO pembersihan_foto 
                         (pembersihan_id, tahap, foto_path, jam_foto, lokasi_foto) 
                         VALUES (?, ?, ?, NOW(), ?)`,
                        [pembersihanId, tahap, url, lokasi]
                    );
                }
            }
        };

        await insertFoto(foto_sebelum_list, 'sebelum', lokasi_sebelum);
        await insertFoto(foto_sedang_list, 'sedang', lokasi_sedang);
        await insertFoto(foto_setelah_list, 'setelah', lokasi_setelah);

        await connection.commit();
        
        console.log(`✅ === PEMBERSIHAN SAVED SUCCESSFULLY (ID: ${pembersihanId}) ===\n`);
        
        res.status(200).json({ 
            status: 'Success', 
            message: 'Data Berhasil Disimpan.',
            data: {
                id: pembersihanId,
                status: statusLaporan,
                kegiatan_transporter_id: kegiatan_id
            }
        });

    } catch (error) {
        await connection.rollback(); 
        console.error('❌ === ERROR IN SIMPAN PEMBERSIHAN ===', error);
        res.status(500).json({ 
            status: 'Error', 
            message: error.message 
        });
    } finally {
        connection.release(); 
    }
};

// ============================================
// 6. GET ACTIVE PO - FOR DROPDOWN
// ============================================
const getActivePO = async (req, res) => {
    try {
        console.log('🔍 Fetching active PO list...');
        
        const query = `
            SELECT 
                kt.id, 
                k.no_po, 
                t.nama_transporter,
                k.nama_kapal,
                k.material,
                v.nama_vendor,
                kt.status as status_kegiatan_transporter
            FROM kegiatan_transporter kt 
            JOIN kegiatan k ON kt.kegiatan_id = k.id
            JOIN transporter t ON kt.transporter_id = t.id
            LEFT JOIN vendor v ON k.vendor_id = v.id
            WHERE kt.status IN ('On Progress', 'Completed')
            ORDER BY 
                CASE kt.status
                    WHEN 'On Progress' THEN 1
                    WHEN 'Completed' THEN 2
                END,
                k.created_at DESC
        `;
        
        const [rows] = await db.query(query);
        
        console.log(`✅ Found ${rows.length} PO with status On Progress or Completed`);
        
        res.status(200).json({
            status: 'Success',
            data: rows
        });
        
    } catch (error) { 
        console.error('❌ Error in getActivePO:', error);
        res.status(500).json({ 
            status: 'Error', 
            message: error.message 
        }); 
    }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
module.exports = { 
    getListTrukAir,        // For web: list of water trucks
    getDataPembersihan,    // For mobile: list of patroler reports
    getDetailPembersihan,  // For mobile: edit single report
    getDetailWaterTruck,   // For web: detail per PO & transporter
    simpanPembersihan,     // For mobile: save/update report
    getActivePO            // For mobile: PO dropdown
};