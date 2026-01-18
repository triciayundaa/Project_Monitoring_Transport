const db = require('../config/db');

// ==========================================
// 1. HELPER HITUNG HARI (ANTI TIMEZONE)
// ==========================================
const getDaysInMonth = (year, month) => {
    return new Date(Date.UTC(year, month, 0)).getUTCDate(); 
};

// ==========================================
// 2. GET JADWAL (MENGGUNAKAN DATE_FORMAT)
// ==========================================
const getJadwalByMonth = async (req, res) => {
    const { month } = req.query; 
    if (!month) return res.status(400).json({ status: 'Error', message: 'Month required' });

    const [year, mon] = month.split('-').map(Number);

    try {
        const [rows] = await db.query(
            `SELECT 
                DATE_FORMAT(tanggal, '%Y-%m-%d') as tanggalStr, 
                shift1, shift2, shift3, libur 
             FROM jadwal_shift 
             WHERE YEAR(tanggal)=? AND MONTH(tanggal)=?`,
            [year, mon]
        );

        const map = {};
        (rows || []).forEach(r => {
            if(r.tanggalStr) {
                map[r.tanggalStr] = [r.shift1, r.shift2, r.shift3, r.libur];
            }
        });

        res.status(200).json({ status: 'Success', data: map });
    } catch (error) {
        console.error('Error getJadwalByMonth:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// ==========================================
// 3. GENERATE JADWAL (POLA LAMA + NAMA DINAMIS)
// ==========================================
const generateJadwalMonth = async (req, res) => {
    const month = req.query.month || (req.body && req.body.month);
    if (!month) return res.status(400).json({ status: 'Error', message: 'Month required' });
    
    const [year, mon] = month.split('-').map(Number);
    
    try {
        // 1. Ambil Nama Personil dari Database (Dinamis)
        // Disortir agar urutannya konsisten (Misal A, B, C, D)
        const [users] = await db.query("SELECT nama FROM users WHERE role = 'personil' ORDER BY nama ASC");
        
        if (users.length === 0) {
            return res.status(400).json({ status: 'Error', message: 'Tidak ada data personil di database untuk digenerate.' });
        }

        const personilNames = users.map(u => u.nama); 
        // Contoh hasil: ['Adit', 'Budi', 'Caca', 'Dedi'] menggantikan ['Personil A', 'Personil B'...]

        // Pastikan minimal ada 4 personil untuk mengisi 4 slot (S1, S2, S3, Libur)
        // Jika kurang, isi null agar tidak error array index
        while(personilNames.length < 4) personilNames.push(null);

        // 2. Buat Grup Rotasi Sesuai Pola Lama
        // Pola Lama:
        // Group A: [P1, P2, P3, P4]
        // Group B: [P2, P3, P4, P1] (Geser 1)
        
        const groupA = [personilNames[0], personilNames[1], personilNames[2], personilNames[3]];
        const groupB = [personilNames[1], personilNames[2], personilNames[3], personilNames[0]];

        const result = [];
        const totalDays = getDaysInMonth(year, mon);
        
        // 3. Loop Hari dengan Logika Lama (2 Hari Ganti Formasi)
        for (let day = 1; day <= totalDays; day++) {
            const dateKey = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            const dayIndex = day - 1; 
            
            // LOGIKA LAMA YANG DIKEMBALIKAN:
            // (Math.floor(dayIndex / 2) % 2 === 0) 
            // Artinya: Hari 1-2 (Grup A), Hari 3-4 (Grup B), Hari 5-6 (Grup A), dst.
            const slot = (Math.floor(dayIndex / 2) % 2 === 0) ? groupA : groupB;
            
            // Clone array slot agar aman
            result.push({ tanggal: dateKey, slots: [...slot] });
        }
        
        if (result.length > 0) {
            // Hapus data lama
            await db.query(`DELETE FROM jadwal_shift WHERE YEAR(tanggal)=? AND MONTH(tanggal)=?`, [year, mon]);
            
            // Insert data baru
            const values = result.map(g => [g.tanggal, g.slots[0], g.slots[1], g.slots[2], g.slots[3]]);
            
            if (values.length > 0) {
                await db.query(
                    `INSERT INTO jadwal_shift (tanggal, shift1, shift2, shift3, libur) VALUES ?`, 
                    [values]
                );
            }
        }

        const map = {};
        result.forEach(g => { map[g.tanggal] = g.slots; });
        return res.status(200).json({ status: 'Success', data: map, message: 'Jadwal berhasil digenerate' });

    } catch (error) {
        console.error('Error generateJadwalMonth:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

const deleteJadwalMonth = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ status: 'Error', message: 'Month required' });
    const [year, mon] = month.split('-').map(Number);

    try {
        await db.query(`DELETE FROM jadwal_shift WHERE YEAR(tanggal)=? AND MONTH(tanggal)=?`, [year, mon]);
        res.status(200).json({ status: 'Success', message: 'Jadwal dihapus' });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

const upsertJadwalDay = async (req, res) => {
    const { date, slots } = req.body; 
    try {
        const [existing] = await db.query('SELECT id FROM jadwal_shift WHERE tanggal = ?', [date]);
        if (existing.length > 0) {
            await db.query(
                `UPDATE jadwal_shift SET shift1=?, shift2=?, shift3=?, libur=? WHERE tanggal=?`,
                [slots[0], slots[1], slots[2], slots[3], date]
            );
        } else {
            await db.query(
                `INSERT INTO jadwal_shift (tanggal, shift1, shift2, shift3, libur) VALUES (?,?,?,?,?)`,
                [date, slots[0], slots[1], slots[2], slots[3]]
            );
        }
        res.status(200).json({ status: 'Success' });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

const saveJadwalMonth = async (req, res) => {
    const { month, data } = req.body;
    const [year, mon] = month.split('-').map(Number);
    try {
        await db.query(`DELETE FROM jadwal_shift WHERE YEAR(tanggal)=? AND MONTH(tanggal)=?`, [year, mon]);
        const values = [];
        for (const [dateKey, slots] of Object.entries(data)) {
            const s = slots || [null, null, null, null];
            values.push([dateKey, s[0], s[1], s[2], s[3]]);
        }
        if (values.length > 0) {
            await db.query(
                `INSERT INTO jadwal_shift (tanggal, shift1, shift2, shift3, libur) VALUES ?`,
                [values]
            );
        }
        res.status(200).json({ status: 'Success', message: 'Jadwal tersimpan' });
    } catch (error) {
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

module.exports = {
    getJadwalByMonth,
    generateJadwalMonth,
    deleteJadwalMonth,
    upsertJadwalDay,
    saveJadwalMonth
};