const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    // Fetch all kegiatan
    const [kegRows] = await db.query(`
      SELECT * FROM kegiatan
      ORDER BY created_at DESC
    `);

    // Fetch counts of keberangkatan_truk grouped by no_po
    const [countRows] = await db.query(`
      SELECT no_po, COUNT(*) as total_truk FROM keberangkatan_truk GROUP BY no_po
    `);

    // Map counts by no_po for quick lookup
    const countsByPo = {};
    countRows.forEach(r => { countsByPo[r.no_po] = Number(r.total_truk); });

    // Merge counts into kegiatan results - JANGAN UBAH STATUS COMPLETED
    const merged = kegRows.map(k => {
      const cnt = countsByPo[k.no_po] || 0;
      
      // PERBAIKAN: Jangan ubah status jika sudah Completed
      let displayStatus = k.status;
      if (k.status !== 'Completed') {
        // Hanya ubah status jika bukan Completed
        displayStatus = cnt > 0 ? 'On Progress' : k.status;
      }
      
      return {
        ...k,
        total_truk: cnt,
        status: displayStatus
      };
    });

    // Persist total_truk dan status changes ke database
    for (const k of kegRows) {
      const cnt = countsByPo[k.no_po] || 0;
      
      try {
        const updates = [];
        const params = [];
        
        // Update total_truk jika berbeda
        if (Number(k.total_truk) !== Number(cnt)) {
          updates.push('total_truk = ?');
          params.push(cnt);
        }
        
        // PERBAIKAN: Hanya update status ke 'On Progress' jika:
        // - Ada truk (cnt > 0)
        // - Status saat ini 'Waiting'
        if (cnt > 0 && k.status === 'Waiting') {
          updates.push('status = ?');
          params.push('On Progress');
        }
        
        // PERBAIKAN: Kembalikan ke Waiting jika tidak ada truk dan status On Progress
        if (cnt === 0 && k.status === 'On Progress') {
          updates.push('status = ?');
          params.push('Waiting');
        }

        if (updates.length > 0) {
          params.push(k.no_po);
          const sql = `UPDATE kegiatan SET ${updates.join(', ')} WHERE no_po = ?`;
          await db.query(sql, params);
        }
      } catch (e) {
        console.error('PERSIST UPDATE ERROR for', k.no_po, e);
      }
    }

    res.json(merged);
  } catch (err) {
    console.error("GET ALL ERROR:", err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      no_po,
      vendor,
      transporter,
      nama_kapal = '',
      material = '',
      incoterm = '',
      no_bl = '',
      quantity = 0,
      total_truk = 0,
      status = 'Waiting',
      tanggal_mulai,
      tanggal_selesai
    } = req.body;

    if (!no_po || !vendor || !transporter || !tanggal_mulai || !tanggal_selesai)
      return res.status(400).json({ message: 'Field wajib tidak boleh kosong' });

    const qty = Number(quantity) || 0;
    const truk = Number(total_truk) || 0;

    await db.query(
      `INSERT INTO kegiatan
      (no_po,vendor,transporter,nama_kapal,material,incoterm,no_bl,quantity,total_truk,status,tanggal_mulai,tanggal_selesai)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [no_po,vendor,transporter,nama_kapal,material,incoterm,no_bl,qty,truk,status,tanggal_mulai,tanggal_selesai]
    );

    res.status(201).json({ message: 'Kegiatan berhasil ditambahkan' });

  } catch (err) {
    console.log("MYSQL ERROR:", err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};


exports.update = async (req, res) => {
  try {
    const oldNoPo = req.params.old_no_po; 
    const data = req.body;

    if (!data.no_po || !data.vendor || !data.transporter || !data.tanggal_mulai || !data.tanggal_selesai) {
      return res.status(400).json({ message: 'Field wajib tidak boleh kosong' });
    }

    // Cek status saat ini dari database
    const [current] = await db.query(`SELECT status, total_truk FROM kegiatan WHERE no_po = ?`, [oldNoPo]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    }

    const currentStatus = current[0].status;
    const currentTotalTruk = current[0].total_truk || 0;

    // PERBAIKAN: Tidak boleh ubah no_po jika sudah ada truk
    if (oldNoPo !== data.no_po && currentTotalTruk > 0) {
      return res.status(400).json({ 
        message: `Tidak dapat mengubah No PO karena sudah ada ${currentTotalTruk} truk yang terdaftar pada kegiatan ini` 
      });
    }

    // Cek jika user mengganti no_po ke yang sudah ada
    if (oldNoPo !== data.no_po) {
      const [cek] = await db.query(`SELECT no_po FROM kegiatan WHERE no_po = ?`, [data.no_po]);
      if (cek.length > 0) {
        return res.status(400).json({ message: 'No PO sudah dipakai' });
      }
    }

    // Validasi: Jika ada truk yang sudah berangkat, tidak boleh ubah ke Waiting
    if (currentTotalTruk > 0 && data.status === 'Waiting') {
      return res.status(400).json({ 
        message: `Tidak dapat mengubah status ke Waiting karena sudah ada ${currentTotalTruk} truk yang berangkat` 
      });
    }

    let finalStatus = data.status || currentStatus;

    await db.query(`
      UPDATE kegiatan SET
        no_po = ?,
        vendor = ?,
        transporter = ?,
        nama_kapal = ?,
        material = ?,
        incoterm = ?,
        no_bl = ?,
        quantity = ?,
        status = ?,
        tanggal_mulai = ?,
        tanggal_selesai = ?
      WHERE no_po = ?
    `, [
      data.no_po,
      data.vendor,
      data.transporter,
      data.nama_kapal || '',
      data.material || '',
      data.incoterm || '',
      data.no_bl || '',
      Number(data.quantity) || 0,
      finalStatus,
      data.tanggal_mulai,
      data.tanggal_selesai,
      oldNoPo
    ]);

    res.json({ message: 'Update berhasil' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};

// Set kegiatan status (single-field update)
exports.setStatus = async (req, res) => {
  try {
    const { no_po } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Field status required' });

    // Cek total_truk sebelum mengubah status
    const [current] = await db.query(`SELECT total_truk FROM kegiatan WHERE no_po = ?`, [no_po]);
    if (current.length === 0) {
      return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    }

    const totalTruk = current[0].total_truk || 0;

    // Validasi: Jika ada truk, tidak boleh ubah ke Waiting
    if (totalTruk > 0 && status === 'Waiting') {
      return res.status(400).json({ 
        message: `Tidak dapat mengubah ke Waiting karena ada ${totalTruk} truk` 
      });
    }

    await db.query(`UPDATE kegiatan SET status = ? WHERE no_po = ?`, [status, no_po]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error('SET STATUS ERROR:', err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { no_po } = req.params;
    
    // Check current status and total_truk
    const [rows] = await db.query(`SELECT status, total_truk FROM kegiatan WHERE no_po = ?`, [no_po]);
    if (rows.length === 0) return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    
    const currentStatus = rows[0].status;
    const totalTruk = rows[0].total_truk || 0;
    
    // Tidak boleh hapus jika status On Progress/Completed atau ada truk
    if ((currentStatus === 'On Progress' || currentStatus === 'Completed') || totalTruk > 0) {
      return res.status(400).json({ 
        message: `Tidak dapat menghapus kegiatan yang sudah berjalan (${totalTruk} truk) atau sudah selesai` 
      });
    }

    await db.query(`DELETE FROM kegiatan WHERE no_po = ?`, [no_po]);
    res.json({ message: 'Kegiatan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDetail = async (req, res) => {
  try {
    const { no_po } = req.params;

    const [kegiatan] = await db.query(
      `SELECT * FROM kegiatan WHERE no_po = ?`,
      [no_po]
    );

    if (kegiatan.length === 0) {
      return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    }

    const [truk] = await db.query(`
      SELECT
        kt.id,
        kt.tanggal,
        kt.created_at,
        kt.no_seri_pengantar,
        kt.foto_truk,
        kt.foto_surat,
        kt.status,
        kt.keterangan,
        k.nopol,
        u.nama AS nama_personil,
        s.nama_shift
      FROM keberangkatan_truk kt
      LEFT JOIN kendaraan k ON kt.kendaraan_id = k.id
      LEFT JOIN users u ON kt.email_user = u.email
      LEFT JOIN shift s ON kt.shift_id = s.id
      WHERE kt.no_po = ?
      ORDER BY kt.created_at DESC
    `, [no_po]);

    const total_truk = truk.length;
    const terverifikasi = truk.filter(t => t.status === 'Valid').length;
    const tidak_valid = truk.filter(t => t.status === 'Tolak').length;
    const belum_terverifikasi = total_truk - terverifikasi - tidak_valid;

    res.json({
      kegiatan: kegiatan[0],
      truk,
      statistik: {
        total_truk,
        terverifikasi,
        belum_terverifikasi,
        tidak_valid
      }
    });

  } catch (err) {
    console.error("DETAIL ERROR:", err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};