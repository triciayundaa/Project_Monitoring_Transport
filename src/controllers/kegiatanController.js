const db = require('../config/db');

console.log('🔥 kegiatanController.js loaded');

// ==========================================
// 1. AMBIL SEMUA (Read) - FORMAT DIPERBAIKI
const getAll = async (req, res) => {
    try {
        const query = `
            SELECT 
                k.id, k.no_po, v.nama_vendor AS vendor, k.nama_kapal, k.material,
                k.incoterm, k.no_bl, k.quantity, k.tanggal_mulai, k.tanggal_selesai,
                kt.id AS kegiatan_transporter_id, t.id AS transporter_id,
                t.nama_transporter, kt.status,
                (
                    SELECT COUNT(*)
                    FROM keberangkatan_truk kbt
                    JOIN kegiatan_kendaraan kk ON kbt.kegiatan_kendaraan_id = kk.id
                    WHERE kk.kegiatan_transporter_id = kt.id
                ) AS total_truk
            FROM kegiatan k
            LEFT JOIN vendor v ON k.vendor_id = v.id
            LEFT JOIN kegiatan_transporter kt ON kt.kegiatan_id = k.id
            LEFT JOIN transporter t ON t.id = kt.transporter_id
            ORDER BY k.created_at DESC, t.nama_transporter
        `;

        const [rows] = await db.query(query);

        // Menggunakan Map (seperti kode sebelumnya) agar logika grouping identik
        const map = {};

        for (const row of rows) {
            if (!map[row.id]) {
                map[row.id] = {
                    id: row.id,
                    no_po: row.no_po,
                    vendor: row.vendor,
                    nama_kapal: row.nama_kapal,
                    material: row.material,
                    incoterm: row.incoterm,
                    no_bl: row.no_bl,
                    quantity: row.quantity,
                    tanggal_mulai: row.tanggal_mulai,
                    tanggal_selesai: row.tanggal_selesai,
                    total_truk: 0, // Akan diakumulasi di bawah
                    transporters: []
                };
            }

            if (row.transporter_id) {
                map[row.id].total_truk += row.total_truk;
                map[row.id].transporters.push({
                    kegiatan_transporter_id: row.kegiatan_transporter_id,
                    id: row.transporter_id,
                    nama: row.nama_transporter,
                    status: row.status || 'Waiting',
                    jumlah_truk: row.total_truk
                });
            }
        }

        // KEMBALIKAN KE FORMAT LAMA: Langsung kirim array-nya saja
        // Sesuai kode sebelumnya: res.json(Object.values(map));
        res.json(Object.values(map)); 

    } catch (error) {
        console.error("❌ GET ALL ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// 2. AMBIL DETAIL LENGKAP
// ==========================================
const getDetailByPO = async (req, res) => {
    const { no_po } = req.params;
    try {
        const [kegiatanRows] = await db.query(`
            SELECT k.*, v.nama_vendor as vendor 
            FROM kegiatan k 
            LEFT JOIN vendor v ON k.vendor_id = v.id 
            WHERE TRIM(k.no_po) = TRIM(?)`, [no_po]);
            
        if (kegiatanRows.length === 0) {
            return res.status(404).json({ message: "Kegiatan tidak ditemukan" });
        }
        const kegiatanData = kegiatanRows[0];

        const [transporterRows] = await db.query(`
            SELECT 
                kt.id as kegiatan_transporter_id,
                t.id as transporter_id,
                t.nama_transporter, 
                kt.status,
                (
                    SELECT COUNT(*) 
                    FROM keberangkatan_truk kbt 
                    JOIN kegiatan_kendaraan kk ON kbt.kegiatan_kendaraan_id = kk.id
                    WHERE kk.kegiatan_transporter_id = kt.id
                ) as jumlah_truk
            FROM kegiatan_transporter kt
            JOIN transporter t ON kt.transporter_id = t.id
            WHERE kt.kegiatan_id = ?
            ORDER BY t.nama_transporter
        `, [kegiatanData.id]);

        const [trukRows] = await db.query(`
            SELECT 
                kbt.id, kbt.created_at, kbt.tanggal, kbt.no_seri_pengantar,
                kbt.foto_truk, kbt.foto_surat, COALESCE(kbt.keterangan, '') as keterangan, 
                kbt.status, u.nama as nama_personil, s.nama_shift, 
                ken.plat_nomor as nopol, t.nama_transporter, kt.id as kegiatan_transporter_id
            FROM keberangkatan_truk kbt
            JOIN kegiatan_kendaraan kk ON kbt.kegiatan_kendaraan_id = kk.id
            JOIN kegiatan_transporter kt ON kk.kegiatan_transporter_id = kt.id
            JOIN transporter t ON kt.transporter_id = t.id
            JOIN kendaraan ken ON kk.kendaraan_id = ken.id
            LEFT JOIN users u ON kbt.email_user = u.email
            LEFT JOIN shift s ON kbt.shift_id = s.id
            WHERE kt.kegiatan_id = ?
            ORDER BY kbt.created_at DESC
        `, [kegiatanData.id]);

        const statistik = {
            total_truk: trukRows.length,
            belum_terverifikasi: trukRows.filter(t => !t.status || t.status === 'Waiting').length,
            terverifikasi: trukRows.filter(t => t.status === 'Valid').length,
            tidak_valid: trukRows.filter(t => t.status === 'Tolak').length
        };

        res.json({
            kegiatan: kegiatanData,
            transporters: transporterRows,
            statistik: statistik,
            truk: trukRows
        });

    } catch (error) {
        console.error("GET DETAIL ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 2a. AMBIL SEMUA TRANSPORTER
const getAllTransporters = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, nama_transporter FROM transporter ORDER BY nama_transporter');
        res.json(rows);
    } catch (error) {
        console.error("GET TRANSPORTERS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 3. TAMBAH KEGIATAN
const create = async (req, res) => {
    try {
        const no_po = req.body.no_po || req.body.noPo || req.body.nomor_po;
        const nama_vendor = req.body.nama_vendor || req.body.vendor || req.body.namaVendor;
        const transporters = req.body.transporters || [];
        const { nama_kapal, material, incoterm, no_bl, quantity, tanggal_mulai, tanggal_selesai } = req.body;

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

        const [kegiatanResult] = await db.query(
            `INSERT INTO kegiatan 
            (no_po, vendor_id, nama_kapal, material, incoterm, no_bl, quantity, tanggal_mulai, tanggal_selesai) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [no_po, vendorId, nama_kapal, material, incoterm, no_bl, quantity, tanggal_mulai, tanggal_selesai]
        );

        const kegiatanId = kegiatanResult.insertId;

        if (transporters && transporters.length > 0) {
            for (const transporterName of transporters) {
                if (!transporterName || transporterName.trim() === '') continue;

                let transporterId;
                const [existingTransporter] = await db.query('SELECT id FROM transporter WHERE nama_transporter = ?', [transporterName.trim()]);

                if (existingTransporter.length > 0) {
                    transporterId = existingTransporter[0].id;
                } else {
                    const [newTransporter] = await db.query('INSERT INTO transporter (nama_transporter) VALUES (?)', [transporterName.trim()]);
                    transporterId = newTransporter.insertId;
                }

                await db.query(
                    'INSERT INTO kegiatan_transporter (kegiatan_id, transporter_id, status) VALUES (?, ?, ?)',
                    [kegiatanId, transporterId, 'Waiting']
                );
            }
        }
        res.status(201).json({ message: 'Kegiatan berhasil ditambahkan' });
    } catch (error) {
        console.error("CREATE ERROR:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Nomor PO sudah ada di database!" });
        }
        res.status(500).json({ message: error.message });
    }
};

// 4. UPDATE STATUS
const updateStatus = async (req, res) => {
    const { no_po } = req.params;
    const { transporter_id, status } = req.body;

    const validStatuses = ['Waiting', 'On Progress', 'Completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Status tidak valid." });
    }

    try {
        const [kegiatan] = await db.query('SELECT id FROM kegiatan WHERE no_po = ?', [no_po]);
        if (kegiatan.length === 0) return res.status(404).json({ message: "Kegiatan tidak ditemukan" });

        const [result] = await db.query(
            'UPDATE kegiatan_transporter SET status = ? WHERE kegiatan_id = ? AND transporter_id = ?', 
            [status, kegiatan[0].id, transporter_id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: "Relasi kegiatan-transporter tidak ditemukan" });

        res.json({ message: `Status berhasil diubah menjadi ${status}` });
    } catch (error) {
        console.error("UPDATE STATUS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 5. UPDATE DATA KEGIATAN
const update = async (req, res) => {
    const { no_po } = req.params; 
    const body = req.body;      

    try {
        const [existingData] = await db.query('SELECT * FROM kegiatan WHERE no_po = ?', [no_po]);
        if (existingData.length === 0) return res.status(404).json({ message: "Kegiatan tidak ditemukan" });

        const oldData = existingData[0];
        let final_no_po = body.no_po || oldData.no_po;
        let final_tanggal_mulai = body.tanggal_mulai || oldData.tanggal_mulai;

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

        await db.query(`
            UPDATE kegiatan SET 
                no_po = ?, vendor_id = ?, nama_kapal = ?, material = ?, 
                incoterm = ?, no_bl = ?, quantity = ?, 
                tanggal_mulai = ?, tanggal_selesai = ?
            WHERE no_po = ?`,
            [final_no_po, vendorId, body.nama_kapal, body.material, body.incoterm, body.no_bl, body.quantity, final_tanggal_mulai, body.tanggal_selesai, no_po]
        );

        // HANDLE TRANSPORTERS
        if (body.transporters && Array.isArray(body.transporters)) {
            const [existingTransporters] = await db.query(`
                SELECT kt.id as kegiatan_transporter_id, t.nama_transporter, kt.status,
                (SELECT COUNT(*) FROM keberangkatan_truk kbt JOIN kegiatan_kendaraan kk ON kbt.kegiatan_kendaraan_id = kk.id WHERE kk.kegiatan_transporter_id = kt.id) as jumlah_truk
                FROM kegiatan_transporter kt JOIN transporter t ON kt.transporter_id = t.id WHERE kt.kegiatan_id = ?
            `, [oldData.id]);

            const usedKegiatanTransporterIds = new Set();

            for (const transporterData of body.transporters) {
                const transporterName = typeof transporterData === 'string' ? transporterData : transporterData.nama;
                if (!transporterName || transporterName.trim() === '') continue;

                let transporterId;
                const [existingTransporter] = await db.query('SELECT id FROM transporter WHERE nama_transporter = ?', [transporterName.trim()]);
                if (existingTransporter.length > 0) {
                    transporterId = existingTransporter[0].id;
                } else {
                    const [newTransporter] = await db.query('INSERT INTO transporter (nama_transporter) VALUES (?)', [transporterName.trim()]);
                    transporterId = newTransporter.insertId;
                }

                if (typeof transporterData === 'object' && transporterData.kegiatan_transporter_id) {
                    const ktId = transporterData.kegiatan_transporter_id;
                    usedKegiatanTransporterIds.add(ktId);
                    await db.query('UPDATE kegiatan_transporter SET transporter_id = ? WHERE id = ?', [transporterId, ktId]);
                } else {
                    const [existingRelation] = await db.query('SELECT id FROM kegiatan_transporter WHERE kegiatan_id = ? AND transporter_id = ?', [oldData.id, transporterId]);
                    if (existingRelation.length === 0) {
                        const [insertResult] = await db.query('INSERT INTO kegiatan_transporter (kegiatan_id, transporter_id, status) VALUES (?, ?, ?)', [oldData.id, transporterId, 'Waiting']);
                        usedKegiatanTransporterIds.add(insertResult.insertId);
                    } else {
                        usedKegiatanTransporterIds.add(existingRelation[0].id);
                    }
                }
            }

            for (const et of existingTransporters) {
                if (!usedKegiatanTransporterIds.has(et.kegiatan_transporter_id)) {
                    if (et.status === 'Waiting' && et.jumlah_truk === 0) {
                        await db.query('DELETE FROM kegiatan_transporter WHERE id = ?', [et.kegiatan_transporter_id]);
                    }
                }
            }
        }
        res.json({ message: "Data kegiatan berhasil diperbarui" });
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 6. HAPUS KEGIATAN
const deleteData = async (req, res) => {
    const { no_po } = req.params;
    try {
        const [kegiatan] = await db.query('SELECT id FROM kegiatan WHERE no_po = ?', [no_po]);
        if (kegiatan.length === 0) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });

        const kegiatanId = kegiatan[0].id;
        const [transporters] = await db.query('SELECT status FROM kegiatan_transporter WHERE kegiatan_id = ?', [kegiatanId]);
        
        if (transporters.some(t => t.status === 'On Progress' || t.status === 'Completed')) {
            return res.status(400).json({ message: 'Tidak dapat menghapus kegiatan karena ada transporter yang sedang berjalan' });
        }

        const [trukCount] = await db.query(
            `SELECT COUNT(*) as total FROM keberangkatan_truk kbt
             JOIN kegiatan_kendaraan kk ON kbt.kegiatan_kendaraan_id = kk.id
             JOIN kegiatan_transporter kt ON kk.kegiatan_transporter_id = kt.id
             WHERE kt.kegiatan_id = ?`, [kegiatanId]);

        if (trukCount[0].total > 0) {
            return res.status(400).json({ message: `Tidak dapat menghapus kegiatan karena sudah ada ${trukCount[0].total} truk yang masuk` });
        }

        await db.query('DELETE FROM kegiatan_transporter WHERE kegiatan_id = ?', [kegiatanId]);
        await db.query('DELETE FROM kegiatan WHERE id = ?', [kegiatanId]);
        res.json({ message: 'Kegiatan berhasil dihapus' });
    } catch (error) {
        console.error("DELETE ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

// 7. UPDATE TRANSPORTER STATUS
const updateTransporterStatus = async (req, res) => {
    const { no_po, transporter_id, status } = req.body;
    try {
        if (!['Waiting', 'On Progress', 'Completed'].includes(status)) return res.status(400).json({ message: 'Status tidak valid' });

        const [result] = await db.query('UPDATE kegiatan_transporter SET status = ? WHERE id = ?', [status, transporter_id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Transporter tidak ditemukan atau ID salah' });

        res.json({ message: 'Status transporter berhasil diperbarui', status });
    } catch (error) {
        console.error('❌ Error Update Status:', error);
        res.status(500).json({ message: error.message });
    }
};

console.log('📦 Exporting functions...');

module.exports = {
    getAll,
    getDetailByPO,
    getAllTransporters,
    create,
    updateStatus,
    update,
    deleteData,
    updateTransporterStatus
};

console.log('✅ Controller exported successfully');