const db = require('../config/db');

// Cek apakah PO ada di database
const cekPO = async (req, res) => {
    const { no_po } = req.body;

    try {
        // Trim dan normalize input
        const noPoTrimmed = no_po ? no_po.trim() : '';
        
        console.log('=== DEBUG CEK PO ===');
        console.log('Input no_po (raw):', no_po);
        console.log('Input no_po (trimmed):', noPoTrimmed);
        console.log('Input length:', noPoTrimmed.length);
        
        if (!noPoTrimmed) {
            return res.status(400).json({
                status: 'Error',
                message: 'Nomor PO tidak boleh kosong'
            });
        }

        // Query mencari kegiatan berdasarkan no_po (case-insensitive, trim)
        // Menggunakan BINARY untuk exact match atau tanpa BINARY untuk case-insensitive
        const [kegiatan] = await db.query(
            `SELECT k.*, v.nama_vendor 
             FROM kegiatan k 
             LEFT JOIN vendor v ON k.vendor_id = v.id 
             WHERE TRIM(k.no_po) = TRIM(?)`,
            [noPoTrimmed]
        );

        console.log('Query result count:', kegiatan.length);
        if (kegiatan.length > 0) {
            console.log('PO ditemukan:', kegiatan[0].no_po);
        } else {
            // Coba cari semua PO untuk debugging
            const [allPO] = await db.query(
                `SELECT no_po, LENGTH(no_po) as panjang, HEX(no_po) as hex 
                 FROM kegiatan 
                 LIMIT 10`
            );
            console.log('Semua PO di database:', allPO);
        }
        console.log('===================');

        if (kegiatan.length > 0) {
            res.status(200).json({
                status: 'Success',
                message: 'PO ditemukan',
                data: kegiatan[0]
            });
        } else {
            res.status(404).json({
                status: 'Error',
                message: 'Nomor PO Tidak Ditemukan'
            });
        }
    } catch (error) {
        console.error('Error cekPO:', error);
        res.status(500).json({ 
            status: 'Error', 
            message: error.message 
        });
    }
};

// Simpan data keberangkatan truk
const simpanKeberangkatan = async (req, res) => {
    const {
        kegiatan_id,
        no_polisi,
        email_user,
        shift_id,
        tanggal,
        no_seri_pengantar,
        foto_truk,
        foto_surat
    } = req.body;

    try {
        // Cari kendaraan berdasarkan nomor polisi
        const [kendaraan] = await db.query(
            'SELECT id FROM kendaraan WHERE plat_nomor = ?',
            [no_polisi]
        );

        if (kendaraan.length === 0) {
            return res.status(404).json({
                status: 'Error',
                message: 'Nomor polisi tidak ditemukan'
            });
        }

        const kendaraan_id = kendaraan[0].id;

        // Insert data keberangkatan truk
        const [result] = await db.query(
            `INSERT INTO keberangkatan_truk 
             (kegiatan_id, kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [kegiatan_id, kendaraan_id, email_user, shift_id, tanggal, no_seri_pengantar, foto_truk, foto_surat]
        );

        res.status(200).json({
            status: 'Success',
            message: 'Data keberangkatan truk berhasil disimpan',
            data: {
                id: result.insertId
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'Error', 
            message: error.message 
        });
    }
};

// Ambil data keberangkatan truk berdasarkan tanggal
const getKeberangkatanByDate = async (req, res) => {
    const { tanggal } = req.query;

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
             WHERE kt.tanggal = ?
             ORDER BY kt.created_at DESC`,
            [tanggal]
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

// Hapus data keberangkatan truk berdasarkan id
const hapusKeberangkatan = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query(
            'DELETE FROM keberangkatan_truk WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 'Error', message: 'Data tidak ditemukan' });
        }

        res.status(200).json({ status: 'Success', message: 'Data berhasil dihapus' });
    } catch (error) {
        console.error('Error hapusKeberangkatan:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

module.exports = {
    cekPO,
    simpanKeberangkatan,
    getKeberangkatanByDate
    ,hapusKeberangkatan
};

