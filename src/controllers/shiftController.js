const db = require('../config/db');

// --- 1. FUNGSI AMBIL SEMUA DATA SHIFT (Untuk Dropdown) ---
const getAllShifts = async (req, res) => {
    try {
        const [shifts] = await db.query('SELECT * FROM shift ORDER BY id ASC');
        res.status(200).json(shifts);
    } catch (error) {
        console.error("❌ Error Get Shifts:", error);
        res.status(500).json({ message: error.message });
    }
};

// --- 2. FUNGSI CARI PERSONIL BERDASARKAN JADWAL (Untuk Auto-Fill) ---
const getPersonilByJadwal = async (req, res) => {
    const { tanggal, jam } = req.query;
    
    // Debugging di Terminal
    console.log(`\n🔍 MENCARI JADWAL...`);
    console.log(`👉 Tanggal: ${tanggal}`);
    console.log(`👉 Jam: ${jam}`);

    if (!tanggal || !jam) {
        return res.status(400).json({ message: 'Tanggal dan Jam diperlukan' });
    }

    try {
        // Tentukan Shift berdasarkan Jam
        const hour = parseInt(jam.split(':')[0]);
        let shiftName = '';
        
        if (hour >= 7 && hour < 15) shiftName = 'Shift 1';
        else if (hour >= 15 && hour < 23) shiftName = 'Shift 2';
        else shiftName = 'Shift 3'; // 23:00 - 06:59

        console.log(`👉 Terdeteksi sebagai: ${shiftName}`);

        // Query Database
        const query = `
            SELECT u.nama, s.id as shift_id, s.nama_shift
            FROM jadwal_shift js
            JOIN users u ON js.email_user = u.email
            JOIN shift s ON js.shift_id = s.id
            WHERE js.tanggal = ? AND s.nama_shift = ?
        `;
        
        const [rows] = await db.query(query, [tanggal, shiftName]);

        if (rows.length > 0) {
            console.log(`✅ KETEMU: ${rows[0].nama} (Shift ID: ${rows[0].shift_id})`);
            res.status(200).json({ status: 'Success', data: rows[0] });
        } else {
            console.log(`❌ TIDAK ADA DATA di Database untuk tanggal ${tanggal} pada ${shiftName}`);
            
            // Ambil info shift saja agar dropdown shift tetap terisi otomatis (fallback)
            const [shiftInfo] = await db.query("SELECT id FROM shift WHERE nama_shift = ?", [shiftName]);
            
            res.status(200).json({ 
                status: 'NotFound', 
                message: 'Jadwal kosong', 
                data: { nama: '', shift_id: shiftInfo[0]?.id, nama_shift: shiftName } 
            });
        }
    } catch (error) {
        console.error("❌ ERROR DATABASE:", error);
        res.status(500).json({ message: error.message });
    }
};

// --- EXPORT KEDUANYA ---
module.exports = { getAllShifts, getPersonilByJadwal };