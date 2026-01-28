const db = require('../config/db');

// ==========================================
// 1. HELPER HITUNG HARI (ANTI TIMEZONE)
// ==========================================
const getDaysInMonth = (year, month) => {
    return new Date(Date.UTC(year, month, 0)).getUTCDate(); 
};

// ==========================================
// 2. GET JADWAL (VERSI RELASIONAL -> PIVOT KE JSON LAMA)
// ==========================================
const getJadwalByMonth = async (req, res) => {
    const { month } = req.query; 
    if (!month) return res.status(400).json({ status: 'Error', message: 'Month required' });

    const [year, mon] = month.split('-').map(Number);

    try {
        // QUERY BARU: Join tabel Users dan Shift
        const [rows] = await db.query(
            `SELECT 
                DATE_FORMAT(js.tanggal, '%Y-%m-%d') as tanggalStr, 
                u.nama as nama_personil,
                s.nama_shift
             FROM jadwal_shift js
             JOIN users u ON js.email_user = u.email
             JOIN shift s ON js.shift_id = s.id
             WHERE YEAR(js.tanggal)=? AND MONTH(js.tanggal)=?
             ORDER BY js.tanggal ASC`,
            [year, mon]
        );

        // TRANSFORMASI DATA (Pivot agar format JSON sama dengan frontend lama)
        // Format Target: { "2023-01-01": ["Budi", "Andi", "Citra", "Dedi"] }
        const map = {};
        
        rows.forEach(r => {
            if (!map[r.tanggalStr]) {
                map[r.tanggalStr] = [null, null, null, null]; // [Shift 1, Shift 2, Shift 3, Libur]
            }
            
            if (r.nama_shift === 'Shift 1') map[r.tanggalStr][0] = r.nama_personil;
            else if (r.nama_shift === 'Shift 2') map[r.tanggalStr][1] = r.nama_personil;
            else if (r.nama_shift === 'Shift 3') map[r.tanggalStr][2] = r.nama_personil;
            else if (r.nama_shift === 'Libur') map[r.tanggalStr][3] = r.nama_personil;
        });

        res.status(200).json({ status: 'Success', data: map });
    } catch (error) {
        console.error('Error getJadwalByMonth:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    }
};

// ==========================================
// 3. GENERATE JADWAL (POLA KONTINYU TAHUNAN)
// ==========================================
const generateJadwalMonth = async (req, res) => {
    const month = req.query.month || (req.body && req.body.month);
    if (!month) return res.status(400).json({ status: 'Error', message: 'Month required' });
    
    const [year, mon] = month.split('-').map(Number);
    
    // Gunakan Transaction biar aman
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 1. Ambil Nama Personil dari Database (Dinamis)
        const [users] = await conn.query("SELECT email, nama FROM users WHERE role = 'personil' ORDER BY nama ASC");
        
        if (users.length < 4) {
            throw new Error('Minimal butuh 4 personil untuk generate jadwal otomatis.');
        }

        // Ambil 4 orang pertama untuk rotasi
        const p1 = users[0]; 
        const p2 = users[1]; 
        const p3 = users[2]; 
        const p4 = users[3]; 

        // 2. Ambil ID Shift
        const [shifts] = await conn.query("SELECT id, nama_shift FROM shift");
        const shiftMap = {};
        shifts.forEach(s => shiftMap[s.nama_shift] = s.id);

        // 3. Definisikan 4 Pola Formasi
        const patterns = [
            [p1, p2, p3, p4], // Pola 0: A, B, C, D
            [p4, p1, p2, p3], // Pola 1: D, A, B, C
            [p3, p4, p1, p2], // Pola 2: C, D, A, B
            [p2, p3, p4, p1]  // Pola 3: B, C, D, A
        ];

        // 4. Hapus data lama bulan ini
        await conn.query(`DELETE FROM jadwal_shift WHERE YEAR(tanggal)=? AND MONTH(tanggal)=?`, [year, mon]);

        const totalDays = getDaysInMonth(year, mon);
        const resultMap = {}; 
        const insertValues = [];

        // === LOGIKA BARU ===
        // Titik tolak rotasi adalah 1 Januari tahun tersebut.
        // Ini menjamin Februari akan melanjutkan Januari, Maret melanjutkan Februari, dst.
        const startOfYear = new Date(Date.UTC(year, 0, 1)); // 1 Jan YYYY

        // 5. Loop Hari
        for (let day = 1; day <= totalDays; day++) {
            // Tanggal yang sedang digenerate (misal: 1 Feb 2026)
            const currentDate = new Date(Date.UTC(year, mon - 1, day));
            const dateKey = currentDate.toISOString().split('T')[0];

            // Hitung selisih hari dari 1 Januari
            // 1 Jan = hari ke-0, 31 Jan = hari ke-30, 1 Feb = hari ke-31
            const diffTime = currentDate - startOfYear;
            const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // Hitung Pola: (HariKeN / 2) % 4
            // Ini akan membuat pola berlanjut terus menerus sepanjang tahun
            const patternIndex = Math.floor(dayIndex / 2) % 4;
            
            const currentTeam = patterns[patternIndex]; // Array object user {nama, email}

            // Simpan ke Result Map (Untuk Response JSON ke Frontend)
            resultMap[dateKey] = [currentTeam[0].nama, currentTeam[1].nama, currentTeam[2].nama, currentTeam[3].nama];

            // Siapkan Data Insert (Shift 1 - Libur)
            insertValues.push([dateKey, currentTeam[0].email, shiftMap['Shift 1']]);
            insertValues.push([dateKey, currentTeam[1].email, shiftMap['Shift 2']]);
            insertValues.push([dateKey, currentTeam[2].email, shiftMap['Shift 3']]);
            insertValues.push([dateKey, currentTeam[3].email, shiftMap['Libur']]);
        }
        
        // 6. Eksekusi Insert
        if (insertValues.length > 0) {
            await conn.query(
                `INSERT INTO jadwal_shift (tanggal, email_user, shift_id) VALUES ?`, 
                [insertValues]
            );
        }

        await conn.commit();
        return res.status(200).json({ status: 'Success', data: resultMap, message: `Jadwal ${month} berhasil digenerate (Kontinyu)` });

    } catch (error) {
        await conn.rollback();
        console.error('Error generateJadwalMonth:', error);
        res.status(500).json({ status: 'Error', message: error.message });
    } finally {
        conn.release();
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

// ==========================================
// 4. UPSERT MANUAL (DENGAN VALIDASI KETAT)
// ==========================================
const upsertJadwalDay = async (req, res) => {
    const { date, slots } = req.body; 
    
    if (!slots || slots.length < 4) return res.status(400).json({ message: 'Data slots tidak lengkap' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Ambil Map Shift ID
        const [shifts] = await conn.query("SELECT id, nama_shift FROM shift");
        const shiftMap = {};
        shifts.forEach(s => shiftMap[s.nama_shift] = s.id);

        // 2. Hapus data lama di tanggal ini
        await conn.query('DELETE FROM jadwal_shift WHERE tanggal = ?', [date]);

        // 3. Insert data baru
        const shiftNames = ['Shift 1', 'Shift 2', 'Shift 3', 'Libur'];
        
        for (let i = 0; i < 4; i++) {
            const namaPersonil = slots[i];
            
            // HANYA PROSES JIKA ADA NAMA (TIDAK NULL/KOSONG)
            if (namaPersonil && namaPersonil.trim() !== "") {
                // Cari email berdasarkan nama
                const [users] = await conn.query('SELECT email FROM users WHERE nama = ?', [namaPersonil]);
                
                if (users.length > 0) {
                    const email = users[0].email;
                    const shiftId = shiftMap[shiftNames[i]];
                    
                    await conn.query(
                        `INSERT INTO jadwal_shift (tanggal, email_user, shift_id) VALUES (?, ?, ?)`,
                        [date, email, shiftId]
                    );
                } else {
                    // 🔥 ERROR KETAT: Jika nama tidak ditemukan, BATALKAN SEMUA!
                    throw new Error(`Personil dengan nama "${namaPersonil}" tidak ditemukan di data Master User. Mohon cek ejaan.`);
                }
            }
        }

        await conn.commit();
        res.status(200).json({ status: 'Success', message: 'Jadwal berhasil diperbarui' });
    } catch (error) {
        await conn.rollback();
        console.error("Gagal Simpan Jadwal:", error.message);
        res.status(500).json({ status: 'Error', message: error.message });
    } finally {
        conn.release();
    }
};

// ==========================================
// 5. SAVE BULANAN (DENGAN VALIDASI KETAT)
// ==========================================
const saveJadwalMonth = async (req, res) => {
    const { month, data } = req.body;
    const [year, mon] = month.split('-').map(Number);
    
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Hapus data lama
        await conn.query(`DELETE FROM jadwal_shift WHERE YEAR(tanggal)=? AND MONTH(tanggal)=?`, [year, mon]);

        // 2. Persiapan Data Reference
        const [shifts] = await conn.query("SELECT id, nama_shift FROM shift");
        const shiftMap = {};
        shifts.forEach(s => shiftMap[s.nama_shift] = s.id);
        const shiftKeys = ['Shift 1', 'Shift 2', 'Shift 3', 'Libur'];

        // Cache User (Nama -> Email)
        const [users] = await conn.query("SELECT nama, email FROM users");
        const userMap = {};
        users.forEach(u => userMap[u.nama] = u.email);

        const insertValues = [];

        // 3. Loop Data dari Frontend
        for (const [dateKey, slots] of Object.entries(data)) {
            if (slots && Array.isArray(slots)) {
                for (let index = 0; index < slots.length; index++) {
                    const namaPersonil = slots[index];
                    
                    if (namaPersonil && namaPersonil.trim() !== "") {
                        if (userMap[namaPersonil]) {
                            const email = userMap[namaPersonil];
                            const shiftId = shiftMap[shiftKeys[index]];
                            insertValues.push([dateKey, email, shiftId]);
                        } else {
                            // 🔥 ERROR KETAT:
                            throw new Error(`Personil "${namaPersonil}" pada tanggal ${dateKey} tidak terdaftar di database.`);
                        }
                    }
                }
            }
        }

        // 4. Insert Batch
        if (insertValues.length > 0) {
            await conn.query(
                `INSERT INTO jadwal_shift (tanggal, email_user, shift_id) VALUES ?`,
                [insertValues]
            );
        }

        await conn.commit();
        res.status(200).json({ status: 'Success', message: 'Jadwal tersimpan' });
    } catch (error) {
        await conn.rollback();
        res.status(500).json({ status: 'Error', message: error.message });
    } finally {
        conn.release();
    }
};

module.exports = {
    getJadwalByMonth,
    generateJadwalMonth,
    deleteJadwalMonth,
    upsertJadwalDay,
    saveJadwalMonth
};