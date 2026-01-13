import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const API = 'http://localhost:3000/api/kegiatan';

const inputStyle =
  'w-full px-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-red-400';

const TambahKegiatan = ({ onClose, onSuccess, mode = 'add', data }) => {
  const [form, setForm] = useState({
    no_po: '',
    vendor: '',
    transporter: '',
    nama_kapal: '',
    material: '',
    incoterm: '',
    no_bl: '',
    quantity: 0,
    tanggal_mulai: '',
    tanggal_selesai: '',
  });

  const [errors, setErrors] = useState({});

  // 🔥 Auto isi saat EDIT
  useEffect(() => {
    if (mode === 'edit' && data) {
      setForm({
        no_po: data.no_po || '',
        vendor: data.vendor || '',
        transporter: data.transporter || '',
        nama_kapal: data.nama_kapal || '',
        material: data.material || '',
        incoterm: data.incoterm || '',
        no_bl: data.no_bl || '',
        quantity: data.quantity || 0,
        tanggal_mulai: data.tanggal_mulai?.substring(0,10) || '',
        tanggal_selesai: data.tanggal_selesai?.substring(0,10) || '',
      });
    }
  }, [mode, data]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const err = {};
    if (!form.no_po) err.no_po = 'Nomor PO wajib diisi';
    if (!form.vendor) err.vendor = 'Vendor wajib diisi';
    if (!form.transporter) err.transporter = 'Transporter wajib diisi';
    if (!form.tanggal_mulai) err.tanggal_mulai = 'Tanggal mulai wajib diisi';
    if (!form.tanggal_selesai) err.tanggal_selesai = 'Tanggal selesai wajib diisi';
    if (form.tanggal_selesai < form.tanggal_mulai)
      err.tanggal_selesai = 'Tanggal selesai tidak boleh lebih awal';

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const url =
      mode === 'edit'
        ? `${API}/${data.old_no_po}`   // PO LAMA (kunci update)
        : API;

    const method = mode === 'edit' ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const err = await res.json();
      alert(err.message || 'Gagal menyimpan');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-xl p-6 animate-scaleIn">

        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold">
            {mode === 'edit' ? 'Edit PO' : 'Tambah PO Baru'}
          </h2>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['no_po','Nomor PO'],['vendor','Nama Vendor'],['transporter','Transporter'],
            ['nama_kapal','Nama Kapal'],['incoterm','Incoterm'],['no_bl','Nomor BL']
          ].map(([name,label])=>(
            <div key={name}>
              <label>{label}</label>
              <input name={name} value={form[name]} onChange={handleChange}
                className={`${inputStyle} ${errors[name] && 'border border-red-500'}`} />
              {errors[name] && <p className="text-red-500 text-xs">{errors[name]}</p>}
            </div>
          ))}

          <div className="col-span-2">
            <label>Material</label>
            <textarea name="material" value={form.material} onChange={handleChange}
              rows="2" className={inputStyle} />
          </div>

          <div className="col-span-2">
            <label>Quantity (ton)</label>
            <input type="number" name="quantity" value={form.quantity}
              onChange={handleChange} className={inputStyle} />
          </div>

          <div>
            <label>Tanggal Mulai</label>
            <input type="date" name="tanggal_mulai" value={form.tanggal_mulai}
              onChange={handleChange} className={inputStyle} />
          </div>

          <div>
            <label>Tanggal Selesai</label>
            <input type="date" name="tanggal_selesai" value={form.tanggal_selesai}
              onChange={handleChange} className={inputStyle} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 border rounded-lg">Batal</button>
          <button onClick={handleSubmit}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            {mode === 'edit' ? 'Update' : 'Simpan'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default TambahKegiatan;
