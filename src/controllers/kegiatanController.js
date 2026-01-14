const db = require('../config/db');

// 1. AMBIL SEMUA (Read)
const getAll = async (req, res) => {
    try {
        // REMOVED: k.total_truk
        const query = `
            SELECT 
                k.id, k.no_po, v.nama_vendor as vendor, k.transporter, 
                k.nama_kapal, k.material, k.incoterm, k.no_bl, k.quantity, 
                k.status, k.tanggal_mulai, k.tanggal_selesai,
                (SELECT COUNT(*) FROM keberangkatan_truk kt WHERE kt.kegiatan_id = k.id) as realisasi_truk
            FROM kegiatan k
            LEFT JOIN vendor v ON k.vendor_id = v.id
            ORDER BY k.created_at DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error("GET ALL ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 2. AMBIL DETAIL LENGKAP (Kegiatan + Truk + Statistik)
const getDetailByPO = async (req, res) => {
    const { no_po } = req.params;
    try {
        const [kegiatanRows] = await db.query(`
            SELECT k.*, v.nama_vendor as vendor 
            FROM kegiatan k 
            LEFT JOIN vendor v ON k.vendor_id = v.id 
            WHERE k.no_po = ?`, [no_po]);
            
        if (kegiatanRows.length === 0) {
            return res.status(404).json({ message: "Kegiatan tidak ditemukan" });
        }
        const kegiatanData = kegiatanRows[0];

        const [trukRows] = await db.query(`
            SELECT 
                kt.id, kt.created_at, kt.tanggal, kt.no_seri_pengantar,
                kt.foto_truk, kt.foto_surat, kt.status, 
                u.nama as nama_personil, s.nama_shift, ken.plat_nomor as nopol
            FROM keberangkatan_truk kt
            LEFT JOIN users u ON kt.email_user = u.email
            LEFT JOIN shift s ON kt.shift_id = s.id
            LEFT JOIN kendaraan ken ON kt.kendaraan_id = ken.id
            WHERE kt.kegiatan_id = ?
            ORDER BY kt.created_at DESC
        `, [kegiatanData.id]);

        const statistik = {
            total_truk: trukRows.length,
            belum_terverifikasi: trukRows.filter(t => !t.status || t.status === 'Waiting').length,
            terverifikasi: trukRows.filter(t => t.status === 'Valid').length,
            tidak_valid: trukRows.filter(t => t.status === 'Tolak').length
        };

        res.json({
            kegiatan: kegiatanData,
            statistik: statistik,
            truk: trukRows
        });

    } catch (error) {
        console.error("GET DETAIL ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 3. TAMBAH KEGIATAN (Create)
const create = async (req, res) => {
    try {
        const no_po = req.body.no_po || req.body.noPo || req.body.nomor_po;
        const nama_vendor = req.body.nama_vendor || req.body.vendor || req.body.namaVendor;
        
        const { 
            transporter, nama_kapal, material, incoterm, 
            no_bl, quantity, tanggal_mulai, tanggal_selesai 
        } = req.body;

        if (!no_po || !nama_vendor) {
            return res.status(400).json({ message: "Gagal: No PO dan Vendor wajib diisi." });
        }

        let vendorId;
        const [existingVendor] = await db.query('SELECT id FROM vendor WHERE nama_vendor = ?', [nama_vendor]);
        if (existingVendor.length > 0) {
            vendorId = existingVendor[0].id;
        } else {
            const [newVendor] = await db.query('INSERT INTO vendor (nama_vendor) VALUES (?)', [nama_vendor]);
            vendorId = newVendor.insertId;
        }

        // REMOVED: total_truk from INSERT
        await db.query(
            `INSERT INTO kegiatan 
            (no_po, vendor_id, transporter, nama_kapal, material, incoterm, no_bl, quantity, tanggal_mulai, tanggal_selesai, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Waiting')`,
            [no_po, vendorId, transporter, nama_kapal, material, incoterm, no_bl, quantity, tanggal_mulai, tanggal_selesai]
        );

        res.status(201).json({ message: 'Kegiatan berhasil ditambahkan' });

    } catch (error) {
        console.error("CREATE ERROR:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Nomor PO sudah ada di database!" });
        }
        res.status(500).json({ message: error.message });
    }
};

// 4. UPDATE STATUS KEGIATAN (PATCH)
const updateStatus = async (req, res) => {
    const { no_po } = req.params;
    const { status } = req.body;

    const validStatuses = ['Waiting', 'On Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status tidak valid." });
    }

    try {
        const [result] = await db.query(
            'UPDATE kegiatan SET status = ? WHERE no_po = ?', 
            [status, no_po]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Kegiatan tidak ditemukan" });
        }

        res.json({ message: `Status berhasil diubah menjadi ${status}` });
    } catch (error) {
        console.error("UPDATE STATUS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 5. UPDATE DATA KEGIATAN (PUT) - Edit PO
const update = async (req, res) => {
    const { no_po } = req.params; 
    const body = req.body;      

    try {
        const [existingData] = await db.query('SELECT * FROM kegiatan WHERE no_po = ?', [no_po]);
        
        if (existingData.length === 0) {
            return res.status(404).json({ message: "Kegiatan tidak ditemukan" });
        }

        const oldData = existingData[0];

        // LOGIKA BISNIS
        if (oldData.status === 'Completed') {
            return res.status(403).json({ 
                message: "Gagal: Kegiatan 'Completed' tidak dapat diedit." 
            });
        }

        let final_no_po = body.no_po;
        let final_tanggal_mulai = body.tanggal_mulai;

        if (oldData.status === 'On Progress') {
            final_no_po = oldData.no_po; 
            final_tanggal_mulai = oldData.tanggal_mulai; 
        }

        let vendorId = oldData.vendor_id; 
        if (body.nama_vendor) {
            const [existingVendor] = await db.query('SELECT id FROM vendor WHERE nama_vendor = ?', [body.nama_vendor]);
            if (existingVendor.length > 0) {
                vendorId = existingVendor[0].id;
            } else {
                const [newVendor] = await db.query('INSERT INTO vendor (nama_vendor) VALUES (?)', [body.nama_vendor]);
                vendorId = newVendor.insertId;
            }
        }

        // REMOVED: total_truk from UPDATE
        const query = `
            UPDATE kegiatan SET 
                no_po = ?, 
                vendor_id = ?, 
                transporter = ?, 
                nama_kapal = ?, 
                material = ?, 
                incoterm = ?, 
                no_bl = ?, 
                quantity = ?, 
                tanggal_mulai = ?, 
                tanggal_selesai = ?
            WHERE no_po = ?
        `;

        await db.query(query, [
            final_no_po,            
            vendorId, 
            body.transporter, 
            body.nama_kapal, 
            body.material, 
            body.incoterm, 
            body.no_bl, 
            body.quantity, 
            final_tanggal_mulai,    
            body.tanggal_selesai, 
            no_po                   
        ]);

        res.json({ message: "Data kegiatan berhasil diperbarui" });

    } catch (error) {
        console.error("UPDATE ERROR:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Nomor PO baru sudah digunakan!" });
        }
        res.status(500).json({ message: error.message });
    }
};

// 6. HAPUS KEGIATAN (DELETE)
const deleteData = async (req, res) => {
    const { no_po } = req.params;

    try {
        const [existing] = await db.query('SELECT status FROM kegiatan WHERE no_po = ?', [no_po]);
        if (existing.length > 0) {
            const status = existing[0].status;
            if (status === 'On Progress' || status === 'Completed') {
                 return res.status(400).json({ message: `Tidak dapat menghapus kegiatan dengan status ${status}` });
            }
        }

        const [result] = await db.query('DELETE FROM kegiatan WHERE no_po = ?', [no_po]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Kegiatan tidak ditemukan" });
        }

        res.json({ message: "Kegiatan berhasil dihapus" });

    } catch (error) {
        console.error("DELETE ERROR:", error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: "Gagal hapus: Kegiatan ini sudah memiliki data truk!" });
        }
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAll,
    getDetailByPO,
    create,
    updateStatus,
    update,
    deleteData
};