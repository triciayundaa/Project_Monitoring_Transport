const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// --- HELPER: PROCESS PHOTO ARRAY ---
const processPhotoArray = (photoArray, prefix) => {
    if (!photoArray || !Array.isArray(photoArray) || photoArray.length === 0) return null;

    const processedPaths = photoArray.map((item, index) => {
        if (typeof item === 'string' && !item.includes('base64')) {
            if (item.includes('/uploads/')) {
                const parts = item.split('/uploads/');
                return parts.length > 1 ? `/uploads/${parts[1]}` : item;
            }
            return item;
        }
        if (typeof item === 'string' && item.includes('base64')) {
            try {
                const uploadDir = path.join(__dirname, '../../public/uploads'); 
                if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }
                
                const matches = item.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (!matches || matches.length !== 3) return null;
                
                const imageBuffer = Buffer.from(matches[2], 'base64');
                const fileName = `${prefix}-${Date.now()}-${index}.jpg`; 
                const filePath = path.join(uploadDir, fileName);
                
                fs.writeFileSync(filePath, imageBuffer);
                return `/uploads/${fileName}`; 
            } catch (error) {
                console.error("Failed to save image:", error);
                return null;
            }
        }
        return null;
    });

    const validPaths = processedPaths.filter(p => p !== null && p !== '');
    return validPaths.length > 0 ? validPaths.join(',') : null;
};

// 1. GET DATA
const getDataPembersihan = async (req, res) => {
    const { email_patroler, tanggal } = req.query;
    try {
        let query = `
            SELECT pj.*, 
                   k.no_po, 
                   t.nama_transporter as nama_vendor, 
                   u.nama as nama_patroler
            FROM pembersihan_jalan pj
            LEFT JOIN kegiatan_transporter kt ON pj.kegiatan_transporter_id = kt.id 
            LEFT JOIN kegiatan k ON kt.kegiatan_id = k.id
            LEFT JOIN transporter t ON kt.transporter_id = t.id
            LEFT JOIN users u ON pj.email_patroler = u.email
        `;
        const params = [];
        const conditions = [];

        if (email_patroler) { conditions.push('pj.email_patroler = ?'); params.push(email_patroler); }
        if (tanggal) { conditions.push('DATE(pj.waktu_mulai) = ?'); params.push(tanggal); }
        
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY pj.created_at DESC';

        const [rows] = await db.query(query, params);
        res.status(200).json({ status: 'Success', data: rows });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// 2. SAVE (INSERT / UPDATE)
const simpanPembersihan = async (req, res) => {
    const { 
        id, kegiatan_id, email_patroler, plat_nomor_truk_air, 
        foto_truk_list, // ARRAY FOTO TRUK DARI FRONTEND
        foto_sebelum_list, foto_sedang_list, foto_setelah_list,
        lokasi_sebelum, lokasi_sedang, lokasi_setelah 
    } = req.body;

    try {
        const [userCheck] = await db.query('SELECT role FROM users WHERE email = ?', [email_patroler]);
        if (userCheck.length === 0 || userCheck[0].role !== 'patroler') return res.status(403).json({ message: "Access Denied!" });

        // PROSES SEMUA FOTO
        const pathTrukStr = processPhotoArray(foto_truk_list, 'truck'); 
        const pathSebelumStr = processPhotoArray(foto_sebelum_list, 'before');
        const pathSedangStr = processPhotoArray(foto_sedang_list, 'during');
        const pathSetelahStr = processPhotoArray(foto_setelah_list, 'after');
        
        const isSblmAda = pathSebelumStr && pathSebelumStr.length > 5;
        const isSdgAda = pathSedangStr && pathSedangStr.length > 5;
        const isStlhAda = pathSetelahStr && pathSetelahStr.length > 5;
        
        const status = (isSblmAda && isSdgAda && isStlhAda) ? 'Completed' : 'Draft';
        const now = new Date();

        if (id) {
            // UPDATE
            const [old] = await db.query('SELECT * FROM pembersihan_jalan WHERE id = ?', [id]);
            const cur = old[0];
            if (cur.status === 'Completed') return res.status(403).json({ message: "Laporan sudah SELESAI." });

            const jamSblm = (isSblmAda && !cur.jam_foto_sebelum) || (pathSebelumStr !== cur.foto_sebelum) ? now : cur.jam_foto_sebelum;
            const jamSdg = (isSdgAda && !cur.jam_foto_sedang) || (pathSedangStr !== cur.foto_sedang) ? now : cur.jam_foto_sedang;
            const jamStlh = (isStlhAda && !cur.jam_foto_setelah) || (pathSetelahStr !== cur.foto_setelah) ? now : cur.jam_foto_setelah;

            const lSblm = lokasi_sebelum || cur.lokasi_foto_sebelum;
            const lSdg = lokasi_sedang || cur.lokasi_foto_sedang;
            const lStlh = lokasi_setelah || cur.lokasi_foto_setelah;

            // PERBAIKAN: Tambahkan foto_truk_air di query UPDATE
            await db.query(`
                UPDATE pembersihan_jalan 
                SET foto_truk_air=?, foto_sebelum=?, foto_sedang=?, foto_setelah=?, 
                    jam_foto_sebelum=?, jam_foto_sedang=?, jam_foto_setelah=?, 
                    lokasi_foto_sebelum=?, lokasi_foto_sedang=?, lokasi_foto_setelah=?,
                    status=? 
                WHERE id=?`, 
                [pathTrukStr, pathSebelumStr, pathSedangStr, pathSetelahStr, jamSblm, jamSdg, jamStlh, lSblm, lSdg, lStlh, status, id]);
            
            res.status(200).json({ status: 'Success', message: 'Data Tersimpan.' });
        } else {
            // INSERT
            if (!kegiatan_id || !plat_nomor_truk_air) return res.status(400).json({ message: "Data utama wajib diisi!" });
            if (!pathTrukStr) return res.status(400).json({ message: "Wajib Foto Bukti Truk!" });
            if (!isSblmAda) return res.status(400).json({ message: "Wajib Foto Sebelum!" });

            const jamSblm = isSblmAda ? now : null;
            const jamSdg = isSdgAda ? now : null;
            const jamStlh = isStlhAda ? now : null;

            // PERBAIKAN: Tambahkan foto_truk_air di query INSERT
            await db.query(`
                INSERT INTO pembersihan_jalan 
                (kegiatan_transporter_id, email_patroler, plat_nomor_truk_air, foto_truk_air, waktu_mulai, 
                 foto_sebelum, foto_sedang, foto_setelah, 
                 jam_foto_sebelum, jam_foto_sedang, jam_foto_setelah, 
                 lokasi_foto_sebelum, lokasi_foto_sedang, lokasi_foto_setelah, status) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, 
                [kegiatan_id, email_patroler, plat_nomor_truk_air, pathTrukStr, now, 
                 pathSebelumStr, pathSedangStr, pathSetelahStr, 
                 jamSblm, jamSdg, jamStlh, 
                 lokasi_sebelum, lokasi_sedang, lokasi_setelah, status]);
            
            res.status(201).json({ status: 'Success', message: 'Laporan dibuat.' });
        }
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// 3. GET ACTIVE PO
const getActivePO = async (req, res) => {
    try {
        const query = `SELECT kt.id, k.no_po, t.nama_transporter FROM kegiatan_transporter kt JOIN kegiatan k ON kt.kegiatan_id = k.id JOIN transporter t ON kt.transporter_id = t.id ORDER BY k.created_at DESC`;
        const [rows] = await db.query(query);
        res.status(200).json(rows);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getDataPembersihan, simpanPembersihan, getActivePO };