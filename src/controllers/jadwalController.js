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
// 3. GENERATE JADWAL (POLA ROTASI 4 FORMATION SETIAP 2 HARI)
// ==========================================
const generateJadwalMonth = async (req, res) => {
    const month = req.query.month || (req.body && req.body.month);
    if (!month) return res.status(400).json({ status: 'Error', message: 'Month required' });
    
    const [year, mon] = month.split('-').map(Number);
    
    try {
        // 1. Ambil Nama Personil dari Database (Dinamis)
        const [users] = await db.query("SELECT nama FROM users WHERE role = 'personil' ORDER BY nama ASC");
        
        if (users.length === 0) {
            return res.status(400).json({ status: 'Error', message: 'Tidak ada data personil di database untuk digenerate.' });
        }

        const personilNames = users.map(u => u.nama); 
        // Contoh: ['Adit', 'Budi', 'Caca', 'Dedi'] -> [A, B, C, D]

        // Pastikan minimal ada 4 personil untuk mengisi 4 slot
        while(personilNames.length < 4) personilNames.push(null);

        // Ambil 4 orang pertama untuk rotasi
        const p1 = personilNames[0]; // A
        const p2 = personilNames[1]; // B
        const p3 = personilNames[2]; // C
        const p4 = personilNames[3]; // D

        // 2. Definisikan 4 Pola Formasi (Rotasi ke Kanan)
        const patterns = [
            [p1, p2, p3, p4], // Pola 0: A, B, C, D (Hari 1-2)
            [p4, p1, p2, p3], // Pola 1: D, A, B, C (Hari 3-4)
            [p3, p4, p1, p2], // Pola 2: C, D, A, B (Hari 5-6)
            [p2, p3, p4, p1]  // Pola 3: B, C, D, A (Hari 7-8)
        ];

        const result = [];
        const totalDays = getDaysInMonth(year, mon);
        
        // 3. Loop Hari
        for (let day = 1; day <= totalDays; day++) {
            const dateKey = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // LOGIKA PENENTUAN POLA:
            // (day - 1) / 2 di-floor -> Akan menghasilkan angka yang sama setiap 2 hari.
            // Contoh: 
            // Hari 1 (0/2 = 0), Hari 2 (1/2 = 0) -> Index 0
            // Hari 3 (2/2 = 1), Hari 4 (3/2 = 1) -> Index 1
            // ...
            // % 4 digunakan agar setelah Index 3 kembali lagi ke 0.
            const patternIndex = Math.floor((day - 1) / 2) % 4;
            
            const currentSlot = patterns[patternIndex];

            result.push({ tanggal: dateKey, slots: [...currentSlot] });
        }
        
        if (result.length > 0) {
            // Hapus data lama bulan ini
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