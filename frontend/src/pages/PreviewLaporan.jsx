import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, CheckCircle, Truck, User, Phone, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import API_BASE_URL from '../config/api'; // <--- IMPORT CONFIG

/* ─── reverse geocode koordinat → nama tempat (Nominatim, gratis) ─── */
const useResolveLocation = (lokasiRaw) => {
  const [label, setLabel] = useState(null);

  useEffect(() => {
    if (!lokasiRaw) return;

    const match = lokasiRaw.match(/^(-?\d+[\.\d]*)\s*[,]\s*(-?\d+[\.\d]*)$/);
    if (!match) {
      setLabel(lokasiRaw);
      return;
    }

    const [, lat, lng] = match;
    let cancelled = false;

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`, {
      headers: { 'Accept-Language': 'id' }
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setLabel(data?.display_name || lokasiRaw);
      })
      .catch(() => {
        if (!cancelled) setLabel(lokasiRaw);
      });

    return () => { cancelled = true; };
  }, [lokasiRaw]);

  return label;
};

const getPhotoUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  // GUNAKAN API_BASE_URL
  return `${API_BASE_URL}${path}`;
};

const splitPhotos = (photoString) => {
  if (!photoString) return [];
  return photoString.split(',').map(p => p.trim()).filter(p => p);
};

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9a8a8a' }}>{label}</span>
    <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: '#c0392b' }} />}
      {value || '–'}
    </span>
  </div>
);

/* ─── MetaBar ─── */
const MetaBar = ({ jam, lokasi }) => {
  const resolvedLokasi = useResolveLocation(lokasi);
  if (!jam && !lokasi) return null;
  return (
    <div className="flex flex-wrap items-center gap-4 mb-3 px-1">
      {jam && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" style={{ color: '#c0392b' }} />
          <span>{new Date(jam).toLocaleString('id-ID')}</span>
        </div>
      )}
      {lokasi && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5" style={{ color: '#c0392b' }} />
          <span>{resolvedLokasi || '…'}</span>
        </div>
      )}
    </div>
  );
};

/* ─── PhotoGrid: klik foto → buka lightbox ─── */
const PhotoGrid = ({ photos, altPrefix, onPhotoClick, groupKey }) => {
  if (!photos.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map((foto, idx) => (
        <div
          key={idx}
          className="rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
          onClick={() => onPhotoClick(groupKey, idx)}
        >
          <img
            src={getPhotoUrl(foto)}
            alt={`${altPrefix} ${idx + 1}`}
            className="w-full object-cover"
            style={{ height: '220px' }}
          />
        </div>
      ))}
    </div>
  );
};

const SectionDivider = ({ label, color }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-1 h-5 rounded-full" style={{ background: color }}></div>
    <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{label}</h4>
  </div>
);

/* ─── Lightbox ─── */
const Lightbox = ({ src, label, index, total, onClose, onPrev, onNext }) => {
  // tutup pakai Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}
    >
      {/* tombol tutup */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* label foto */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-xs font-semibold text-white"
        style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}>
        {label} — {index + 1} / {total}
      </div>

      {/* tombol prev */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* foto utama */}
      <img
        src={src}
        alt={label}
        className="max-w-[90vw] max-h-[85vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* tombol next */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

/* ════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════ */
const PreviewLaporan = ({ laporan, onClose, kegiatan, formatDateTime, allTransporters }) => {
  if (!laporan) return null;

  const fotoTrukArr    = splitPhotos(laporan.foto_truk_air);
  const fotoSebelumArr = splitPhotos(laporan.foto_sebelum);
  const fotoSedangArr  = splitPhotos(laporan.foto_sedang);
  const fotoSetelahArr = splitPhotos(laporan.foto_setelah);
  const platNomorArr   = laporan.plat_nomor_truk_air
    ? laporan.plat_nomor_truk_air.split(',').map(p => p.trim())
    : [];

  const isCompleted = laporan.status === 'Completed';

  const [isFullscreen, setIsFullscreen] = useState(false);
  // groups: semua grup foto dikumpulkan buat nav prev/next lintas grup
  const groups = [
    { key: 'truk',    label: 'Foto Truk Air',          photos: fotoTrukArr },
    { key: 'sebelum', label: 'Foto Sebelum Pembersihan', photos: fotoSebelumArr },
    { key: 'sedang',  label: 'Foto Sedang Pembersihan',  photos: fotoSedangArr },
    { key: 'setelah', label: 'Foto Setelah Pembersihan', photos: fotoSetelahArr },
  ].filter(g => g.photos.length > 0);

  // flatten semua foto jadi satu array untuk navigasi
  const allPhotos = groups.flatMap(g => g.photos.map((p, i) => ({ src: p, label: g.label })));

  const [lightboxIdx, setLightboxIdx] = useState(null); // index di allPhotos

  const openLightbox = (groupKey, fotoIdx) => {
    // hitung offset di allPhotos
    let offset = 0;
    for (const g of groups) {
      if (g.key === groupKey) break;
      offset += g.photos.length;
    }
    setLightboxIdx(offset + fotoIdx);
  };

  const closeLightbox = () => setLightboxIdx(null);

  const prevPhoto = () => setLightboxIdx((prev) => (prev === 0 ? allPhotos.length - 1 : prev - 1));
  const nextPhoto = () => setLightboxIdx((prev) => (prev === allPhotos.length - 1 ? 0 : prev + 1));

  return (
    <>
      <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ background: 'rgba(20,18,18,0.65)', backdropFilter: 'blur(3px)' }}>
        <div className={`min-h-screen flex items-start justify-center ${isFullscreen ? 'p-0' : 'py-10 px-4'}`}>
          <div className={`bg-white shadow-2xl w-full ${isFullscreen ? 'min-h-screen rounded-none max-w-none' : 'rounded-2xl max-w-4xl'}`} style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

            {/* header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f5eeee 0%, #f0e8e8 100%)' }}>
              <h2 className="text-base font-bold text-gray-700">Preview Laporan</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsFullscreen(fs => !fs)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title={isFullscreen ? 'Kembalikan ukuran' : 'Perbesar'}
                >
                  {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* body */}
            <div className={`${isFullscreen ? 'p-10 max-w-5xl mx-auto' : 'p-8'}`}>

              {/* informasi laporan */}
              <div className="rounded-xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, #f5eeee 0%, #f2e6e6 100%)', border: '1px solid #eedede' }}>
                <div className="flex items-center justify-between mb-4">
                  <SectionDivider label="Informasi Laporan" color="linear-gradient(180deg, #c0392b, #d9534f)" />
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isCompleted ? 'text-emerald-700' : 'text-amber-700'}`}
                    style={{ background: isCompleted ? '#dcfce7' : '#fef3c7' }}>
                    {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {isCompleted ? 'Completed' : 'Draft'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                  <InfoRow label="Nama Petugas Lapangan" value={laporan.nama_petugas || '-'}       icon={User} />
                  <InfoRow label="No. Telepon"            value={laporan.no_telp_petugas || '-'}    icon={Phone} />
                  <InfoRow label="Transporter"            value={laporan.nama_transporter || '-'}   icon={Truck} />
                </div>
              </div>

              {/* area pembersihan */}
              {laporan.lokasi_pembersihan && (
                <div className="rounded-xl p-5 mb-6" style={{ background: '#fafafa', border: '1px solid #e8d8d8' }}>
                  <SectionDivider label="Area Pembersihan" color="linear-gradient(180deg, #c0392b, #d9534f)" />
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#c0392b' }} />
                    <span className="font-medium">{laporan.lokasi_pembersihan}</span>
                  </div>
                </div>
              )}

              {/* plat nomor */}
              <div className="rounded-xl p-5 mb-6" style={{ background: '#fafafa', border: '1px solid #e8d8d8' }}>
                <SectionDivider label="Plat Nomor Truk Air" color="linear-gradient(180deg, #c0392b, #d9534f)" />
                {platNomorArr.length > 0 ? (
                  <div className="flex flex-wrap gap-2.5">
                    {platNomorArr.map((plat, idx) => (
                      <div key={idx} className="px-5 py-2 rounded-lg font-bold text-base tracking-widest shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #f5eeee, #eedede)', color: '#a33025', border: '1px solid #d9c0c2' }}>
                        {plat}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Tidak ada data plat nomor</p>
                )}
              </div>

              {/* foto truk air */}
              {fotoTrukArr.length > 0 && (
                <div className="mb-6">
                  <SectionDivider label="Foto Truk Air" color="linear-gradient(180deg, #c0392b, #d9534f)" />
                  <PhotoGrid photos={fotoTrukArr} altPrefix="Truk Air" groupKey="truk" onPhotoClick={openLightbox} />
                </div>
              )}

              {/* foto sebelum */}
              {fotoSebelumArr.length > 0 && (
                <div className="mb-6">
                  <SectionDivider label="Foto Sebelum Pembersihan" color="linear-gradient(180deg, #c0392b, #d9534f)" />
                  <MetaBar jam={laporan.jam_foto_sebelum} lokasi={laporan.lokasi_foto_sebelum} />
                  <PhotoGrid photos={fotoSebelumArr} altPrefix="Sebelum" groupKey="sebelum" onPhotoClick={openLightbox} />
                </div>
              )}

              {/* foto sedang */}
              {fotoSedangArr.length > 0 && (
                <div className="mb-6">
                  <SectionDivider label="Foto Sedang Pembersihan" color="linear-gradient(180deg, #c0392b, #d9534f)" />
                  <MetaBar jam={laporan.jam_foto_sedang} lokasi={laporan.lokasi_foto_sedang} />
                  <PhotoGrid photos={fotoSedangArr} altPrefix="Sedang" groupKey="sedang" onPhotoClick={openLightbox} />
                </div>
              )}

              {/* foto setelah */}
              {fotoSetelahArr.length > 0 && (
                <div className="mb-6">
                  <SectionDivider label="Foto Setelah Pembersihan" color="linear-gradient(180deg, #c0392b, #d9534f)" />
                  <MetaBar jam={laporan.jam_foto_setelah} lokasi={laporan.lokasi_foto_setelah} />
                  <PhotoGrid photos={fotoSetelahArr} altPrefix="Setelah" groupKey="setelah" onPhotoClick={openLightbox} />
                </div>
              )}

              {/* footer */}
              <div className="mt-8 pt-4 text-center" style={{ borderTop: '1px dashed #d8cece' }}>
                <p className="text-xs text-gray-400">Laporan dibuat pada: <span className="font-medium text-gray-500">{new Date().toLocaleString('id-ID')}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox overlay ── */}
      {lightboxIdx !== null && (
        <Lightbox
          src={getPhotoUrl(allPhotos[lightboxIdx].src)}
          label={allPhotos[lightboxIdx].label}
          index={lightboxIdx}
          total={allPhotos.length}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </>
  );
};

export default PreviewLaporan;