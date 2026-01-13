const db = require('../config/db');

// ==========================================
// 1. PERBAIKAN LOGIKA HITUNG HARI (ANTI TIMEZONE)
// ==========================================
const getDaysInMonth = (year, month) => {
    // Gunakan Date.UTC agar tidak terpengaruh jam lokal server (WIB vs UTC)
    // month di sini 1-based (1=Januari)
    // Date.UTC(year, month, 0) mengambil tanggal terakhir di bulan tsb dalam UTC.
    return new Date(Date.UTC(year, month, 0)).getUTCDate(); 
};

// ==========================================
// 2. GENERATE JADWAL (FORMAT STRING MURNI)
// ==========================================
const generateDefaultMonth = (year, mon) => {
    const groupA = ['Personil A', 'Personil B', 'Personil C', 'Personil D'];
    const groupB = ['Personil B', 'Personil C', 'Personil D', 'Personil A'];
    const result = [];

    const totalDays = getDaysInMonth(year, mon);
    
    // Debugging: Pastikan total hari benar (Januari harus 31)
    console.log(`[DEBUG] Generating ${year}-${mon}. Total Days: ${totalDays}`);

    for (let day = 1; day <= totalDays; day++) {
        // Construct string manual 'YYYY-MM-DD'
        // Ini menjamin yang dikirim ke DB adalah text, bukan objek waktu
        const dateKey = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayIndex = day - 1; 
        const slot = (Math.floor(dayIndex / 2) % 2 === 0) ? groupA : groupB;
        
        result.push({ tanggal: dateKey, slots: [...slot] });
    }
    
    // Debugging: Cek tanggal pertama dan terakhir yang akan diinsert
    if (result.length > 0) {
        console.log(`[DEBUG] First Date: ${result[0].tanggal}`);
        console.log(`[DEBUG] Last Date: ${result[result.length-1].tanggal}`);
    }

    return result;
};

// ==========================================
// 3. GET JADWAL (MENGGUNAKAN DATE_FORMAT)
// ==========================================
const getJadwalByMonth = async (req, res) => {
    const { month } = req.query; 
    if (!month) return res.status(400).json({ status: 'Error', message: 'Month required' });

    const [year, mon] = month.split('-').map(Number);

    try {
        // DATE_FORMAT memaksa MySQL mengembalikan String, bukan Date Object
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
            // Gunakan alias 'tanggalStr'
            if(r.tanggalStr) {
                map[r.tanggalStr] = [r.shift1, r.shift2, r.shift3, r.libur];
            }
        });

        console.log(`[DEBUG] Fetched ${rows.length} rows for ${month}`);
        res.status(200).json({ status: 'Success', data: map });
    } catch (error) {
        console.error('Error getJadwalByMonth:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// ==========================================
// 4. GENERATE & INSERT (MEMBERSIHKAN DATA SEBELUMNYA)
// ==========================================
const generateJadwalMonth = async (req, res) => {
    const month = req.query.month || (req.body && req.body.month);
    if (!month) return res.status(400).json({ status: 'Error', message: 'Month required' });
    
    const [year, mon] = month.split('-').map(Number);
    
    try {
        const generated = generateDefaultMonth(year, mon);
        
        if (generated.length > 0) {
            // Hapus data bulan ini agar tidak duplicate
            await db.query(`DELETE FROM jadwal_shift WHERE YEAR(tanggal)=? AND MONTH(tanggal)=?`, [year, mon]);
            
            // Siapkan values untuk bulk insert
            const values = generated.map(g => [g.tanggal, g.slots[0], g.slots[1], g.slots[2], g.slots[3]]);
            
            if (values.length > 0) {
                await db.query(
                    `INSERT INTO jadwal_shift (tanggal, shift1, shift2, shift3, libur) VALUES ?`, 
                    [values]
                );
            }
        }

        const map = {};
        generated.forEach(g => { map[g.tanggal] = g.slots; });
        return res.status(200).json({ status: 'Success', data: map, message: 'Jadwal berhasil digenerate' });
    } catch (error) {
        console.error('Error generateJadwalMonth:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// ... (Sisa fungsi delete, upsert, save biarkan tetap sama seperti sebelumnya) ...
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