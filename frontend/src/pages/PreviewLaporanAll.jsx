import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, CheckCircle, Truck, User, Mail, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

/* ─── reverse geocode ─── */
const useResolveLocation = (lokasiRaw) => {
  const [label, setLabel] = useState(null);
  useEffect(() => {
    if (!lokasiRaw) return;
    const match = lokasiRaw.match(/^(-?\d+[\.\d]*)\s*[,]\s*(-?\d+[\.\d]*)$/);
    if (!match) { setLabel(lokasiRaw); return; }
    const [, lat, lng] = match;
    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`, {
      headers: { 'Accept-Language': 'id' }
    })
      .then(r => r.json())
      .then(data => { if (!cancelled) setLabel(data?.display_name || lokasiRaw); })
      .catch(() => { if (!cancelled) setLabel(lokasiRaw); });
    return () => { cancelled = true; };
  }, [lokasiRaw]);
  return label;
};

/* ─── utils ─── */
const getPhotoUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  return `http://localhost:3000${path}`;
};
const splitPhotos = (str) => (str ? str.split(',').map(s => s.trim()).filter(Boolean) : []);

/* ─── sub-components ─── */
const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9a8a8a' }}>{label}</span>
    <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" style={{ color: '#c0392b' }} />}
      {value || '–'}
    </span>
  </div>
);

const MetaBar = ({ jam, lokasi }) => {
  const resolved = useResolveLocation(lokasi);
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
          <span>{resolved || '…'}</span>
        </div>
      )}
    </div>
  );
};

const SectionDivider = ({ label }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg, #c0392b, #d9534f)' }}></div>
    <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{label}</h4>
  </div>
);

const PhotoGrid = ({ photos, altPrefix, onPhotoClick, globalOffset }) => {
  if (!photos.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map((foto, idx) => (
        <div
          key={idx}
          className="rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
          onClick={() => onPhotoClick(globalOffset + idx)}
        >
          <img src={getPhotoUrl(foto)} alt={`${altPrefix} ${idx + 1}`} className="w-full object-cover" style={{ height: '220px' }} />
        </div>
      ))}
    </div>
  );
};

/* ─── Lightbox ─── */
const Lightbox = ({ src, label, index, total, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.88)' }} onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors">
        <X className="w-6 h-6" />
      </button>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)' }}>
        {label} — {index + 1} / {total}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <img src={src} alt={label} className="max-w-[90vw] max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
      <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors">
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

/* ════════════════════════════════════════════
   MAIN — PreviewLaporanAll
   ════════════════════════════════════════════ */
const PreviewLaporanAll = ({ laporanList, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  /* ── bangun flat list foto dari semua laporan ── */
  const allPhotos = [];                          // { src, label }
  const laporanMeta = [];                        // per-laporan: { startIdx, groups }

  laporanList.forEach((lap, lapIdx) => {
    const truk    = splitPhotos(lap.foto_truk_air);
    const sebelum = splitPhotos(lap.foto_sebelum);
    const sedang  = splitPhotos(lap.foto_sedang);
    const setelah = splitPhotos(lap.foto_setelah);

    const startIdx = allPhotos.length;
    const groups = [
      { key: 'truk',    label: 'Foto Truk Air',            photos: truk },
      { key: 'sebelum', label: 'Foto Sebelum Pembersihan', photos: sebelum },
      { key: 'sedang',  label: 'Foto Sedang Pembersihan',  photos: sedang },
      { key: 'setelah', label: 'Foto Setelah Pembersihan', photos: setelah },
    ].filter(g => g.photos.length > 0);

    groups.forEach(g => {
      g.photos.forEach(src => {
        allPhotos.push({ src, label: `Laporan #${lapIdx + 1} – ${g.label}` });
      });
    });

    laporanMeta.push({ startIdx, groups, lap });
  });

  const openLightbox = (idx) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const prev = () => setLightboxIdx(i => (i === 0 ? allPhotos.length - 1 : i - 1));
  const next = () => setLightboxIdx(i => (i === allPhotos.length - 1 ? 0 : i + 1));

  return (
    <>
      {/* ── modal ── */}
      <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ background: 'rgba(20,18,18,0.65)', backdropFilter: 'blur(3px)' }}>
        <div className={`min-h-screen flex items-start justify-center ${isFullscreen ? 'p-0' : 'py-10 px-4'}`}>
          <div className={`bg-white shadow-2xl w-full ${isFullscreen ? 'min-h-screen rounded-none max-w-none' : 'rounded-2xl max-w-4xl'}`} style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

            {/* header sticky */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #f5eeee 0%, #f0e8e8 100%)' }}>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-700">Preview Semua Laporan</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#c0392b' }}>
                  {laporanList.length} Laporan
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsFullscreen(f => !f)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title={isFullscreen ? 'Kembalikan ukuran' : 'Perbesar'}>
                  {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* body */}
            <div className={isFullscreen ? 'p-10 max-w-5xl mx-auto' : 'p-8'}>

              {laporanList.length === 0 && (
                <p className="text-center text-gray-400 italic py-16">Tidak ada laporan untuk ditampilkan.</p>
              )}

              {laporanMeta.map(({ startIdx, groups, lap }, lapIdx) => {
                const platNomorArr = lap.plat_nomor_truk_air ? lap.plat_nomor_truk_air.split(',').map(s => s.trim()) : [];
                const isCompleted  = lap.status === 'Completed';
                let photoOffset    = startIdx;   // running pointer untuk global foto index

                return (
                  <div key={lapIdx}>
                    {/* ── separator antar laporan ── */}
                    {lapIdx > 0 && (
                      <div className="my-10 flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 py-1 rounded-full bg-gray-100">
                          Laporan berikutnya
                        </span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>
                    )}

                    {/* ── nomor laporan ── */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ background: 'linear-gradient(135deg, #c0392b, #d9534f)' }}>
                        {lapIdx + 1}
                      </div>
                      <h3 className="text-base font-bold text-gray-800">Laporan #{lapIdx + 1}</h3>
                      <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isCompleted ? 'text-emerald-700' : 'text-amber-700'}`}
                        style={{ background: isCompleted ? '#dcfce7' : '#fef3c7' }}>
                        {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {isCompleted ? 'Completed' : 'Draft'}
                      </span>
                    </div>

                    {/* ── info laporan ── */}
                    <div className="rounded-xl p-5 mb-5" style={{ background: 'linear-gradient(135deg, #f5eeee 0%, #f2e6e6 100%)', border: '1px solid #eedede' }}>
                      <SectionDivider label="Informasi Laporan" />
                      <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                        <InfoRow label="Nama Patroler"  value={lap.nama_patroler}    icon={User} />
                        <InfoRow label="Email Patroler" value={lap.email_patroler}   icon={Mail} />
                        <InfoRow label="Transporter"    value={lap.nama_transporter} icon={Truck} />
                      </div>
                    </div>

                    {/* ── plat nomor ── */}
                    <div className="rounded-xl p-5 mb-5" style={{ background: '#fafafa', border: '1px solid #e8d8d8' }}>
                      <SectionDivider label="Plat Nomor Truk Air" />
                      {platNomorArr.length > 0 ? (
                        <div className="flex flex-wrap gap-2.5">
                          {platNomorArr.map((plat, i) => (
                            <div key={i} className="px-5 py-2 rounded-lg font-bold text-base tracking-widest shadow-sm"
                              style={{ background: 'linear-gradient(135deg, #f5eeee, #eedede)', color: '#a33025', border: '1px solid #d9c0c2' }}>
                              {plat}
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-gray-400 italic">Tidak ada data plat nomor</p>}
                    </div>

                    {/* ── foto per grup ── */}
                    {groups.map((g) => {
                      const currentOffset = photoOffset;
                      photoOffset += g.photos.length;   // geser pointer

                      return (
                        <div key={g.key} className="mb-5">
                          <SectionDivider label={g.label} />
                          {/* metabar hanya untuk grup yang punya timestamp/lokasi */}
                          {g.key === 'sebelum' && <MetaBar jam={lap.jam_foto_sebelum} lokasi={lap.lokasi_foto_sebelum} />}
                          {g.key === 'sedang'  && <MetaBar jam={lap.jam_foto_sedang}  lokasi={lap.lokasi_foto_sedang} />}
                          {g.key === 'setelah' && <MetaBar jam={lap.jam_foto_setelah} lokasi={lap.lokasi_foto_setelah} />}
                          <PhotoGrid photos={g.photos} altPrefix={g.label} onPhotoClick={openLightbox} globalOffset={currentOffset} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* footer */}
              <div className="mt-10 pt-4 text-center" style={{ borderTop: '1px dashed #d8cece' }}>
                <p className="text-xs text-gray-400">
                  Preview dibuat pada: <span className="font-medium text-gray-500">{new Date().toLocaleString('id-ID')}</span>
                </p>
                <p className="text-xs text-gray-300 mt-0.5">{laporanList.length} laporan ditampilkan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── lightbox ── */}
      {lightboxIdx !== null && (
        <Lightbox
          src={getPhotoUrl(allPhotos[lightboxIdx].src)}
          label={allPhotos[lightboxIdx].label}
          index={lightboxIdx}
          total={allPhotos.length}
          onClose={closeLightbox}
          onPrev={prev}
          onNext={next}
        />
      )}
    </>
  );
};

export default PreviewLaporanAll;