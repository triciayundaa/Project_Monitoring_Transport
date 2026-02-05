import React, { useState } from 'react';
import { X, FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const UnduhLaporanTrukAir = ({ isOpen, onClose, laporanList, kegiatan, transporter }) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [includePhotos, setIncludePhotos] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  if (!isOpen) return null;

  // ===== LOGIC PENGOLAHAN DATA =====
  
  const uniqueTransporters = [...new Set(laporanList.map(item => item.nama_transporter))].filter(Boolean);
  const hasMultipleTransporters = uniqueTransporters.length > 1;

  let headerTransporterName = '-';
  if (uniqueTransporters.length > 0) {
    headerTransporterName = uniqueTransporters.join(', ');
  } else if (transporter?.nama_transporter) {
    headerTransporterName = transporter.nama_transporter;
  } else if (kegiatan.nama_transporter) {
    headerTransporterName = kegiatan.nama_transporter;
  }

  const sortedLaporanList = [...laporanList].sort((a, b) => {
    const transA = a.nama_transporter || '';
    const transB = b.nama_transporter || '';
    if (transA < transB) return -1;
    if (transA > transB) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const totalTrukReal = sortedLaporanList.reduce((acc, item) => {
    if (!item.plat_nomor_truk_air) return acc;
    const plates = item.plat_nomor_truk_air.split(',').filter(p => p.trim().length > 0);
    return acc + plates.length;
  }, 0);

  // ===== HELPER FUNCTIONS =====
  
  const formatMultiLine = (text) => {
    if (!text || text === 'null' || text === 'undefined') return '-';
    return String(text).split(',').map(item => item.trim()).filter(item => item).join('\n');
  };

  const cleanText = (text) => {
    if (!text || text === 'null' || text === 'undefined') return '-';
    return String(text).replace(/[^\x20-\x7E\n\r]/g, '');
  };

  const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    }).replace('.', ':');
  };

  const getPhotoPaths = (photoString) => {
    if (!photoString) return [];
    if (typeof photoString !== 'string') return [];
    return photoString.split(',').map(p => p.trim()).filter(p => p && p !== 'null' && p !== 'undefined');
  };

  const getPhotoUrl = (cleanPath) => {
    if (!cleanPath) return null;
    if (cleanPath.startsWith('data:')) return cleanPath;
    if (cleanPath.startsWith('http')) return cleanPath;
    let sanitizedPath = cleanPath.replace(/\\/g, '/');
    if (sanitizedPath.startsWith('/')) sanitizedPath = sanitizedPath.substring(1);
    return `${BACKEND_URL}/${sanitizedPath}`;
  };

  const loadImageAsBase64 = (url) => {
    return new Promise((resolve) => {
      if (url.startsWith('data:')) { resolve(url); return; }
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = `${url}?t=${new Date().getTime()}`;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 1000 / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        } catch (error) {
          console.error("⚠️ Tainted Canvas:", url);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.error("❌ Gagal load:", url);
        resolve(null);
      };
    });
  };

  const preloadAllPhotos = async (list) => {
    const photoCache = new Map();
    let totalPhotosToLoad = 0;
    
    list.forEach(lap => {
        totalPhotosToLoad += getPhotoPaths(lap.foto_truk_air).length;
        totalPhotosToLoad += getPhotoPaths(lap.foto_sebelum).length;
        totalPhotosToLoad += getPhotoPaths(lap.foto_sedang).length;
        totalPhotosToLoad += getPhotoPaths(lap.foto_setelah).length;
    });

    console.log(`📊 Total foto: ${totalPhotosToLoad}`);
    let loadedCount = 0;

    const processPhoto = async (rawPath) => {
        const fullUrl = getPhotoUrl(rawPath);
        if (!fullUrl || photoCache.has(fullUrl)) return;
        if (fullUrl.length < 200) setLoadingStatus(`Memuat foto ${loadedCount + 1}/${totalPhotosToLoad}...`);
        const base64 = await loadImageAsBase64(fullUrl);
        if (base64) photoCache.set(fullUrl, base64);
        loadedCount++;
    };
    
    const promises = [];
    for (const lap of list) {
      const allPaths = [
        ...getPhotoPaths(lap.foto_truk_air),
        ...getPhotoPaths(lap.foto_sebelum),
        ...getPhotoPaths(lap.foto_sedang),
        ...getPhotoPaths(lap.foto_setelah)
      ];
      allPaths.forEach(p => promises.push(processPhoto(p)));
    }
    await Promise.all(promises);
    return photoCache;
  };

  // ===== DOWNLOAD EXCEL =====
  const downloadExcel = async () => {
    setIsProcessing(true);
    setLoadingStatus('Membuat Excel...');
    
    try {
      const workbook = XLSX.utils.book_new();
      const worksheetData = [];

      worksheetData.push(['LAPORAN PEMBERSIHAN JALAN']);
      worksheetData.push([]);
      worksheetData.push(['No PO:', kegiatan.no_po || '-']);
      worksheetData.push(['Vendor:', kegiatan.nama_vendor || '-']);
      worksheetData.push(['Nama Kapal:', kegiatan.nama_kapal || '-']);
      worksheetData.push(['Material:', kegiatan.material || '-']);
      worksheetData.push(['Transporter:', headerTransporterName]); 
      worksheetData.push([]);

      const headerRow = [
        'No', 'Waktu Laporan', 'Nama Petugas', 'No HP Petugas', 'Area Pembersihan'
      ];

      if (hasMultipleTransporters) {
        headerRow.push('Transporter');
      }

      headerRow.push(
        'Plat No Truk Air', 
        'Jam Sebelum', 'Lokasi Sebelum',
        'Jam Sedang', 'Lokasi Sedang',
        'Jam Setelah', 'Lokasi Setelah',
        'Status'
      );

      worksheetData.push(headerRow);

      sortedLaporanList.forEach((lap, index) => {
        const row = [
          index + 1,
          formatDateTime(lap.created_at),
          cleanText(lap.nama_petugas),
          cleanText(lap.no_telp_petugas),
          cleanText(lap.lokasi_pembersihan)
        ];

        if (hasMultipleTransporters) {
          row.push(cleanText(lap.nama_transporter));
        }

        row.push(
          formatMultiLine(lap.plat_nomor_truk_air),
          formatTime(lap.jam_foto_sebelum), cleanText(lap.lokasi_foto_sebelum),
          formatTime(lap.jam_foto_sedang), cleanText(lap.lokasi_foto_sedang),
          formatTime(lap.jam_foto_setelah), cleanText(lap.lokasi_foto_setelah),
          lap.status || '-'
        );

        worksheetData.push(row);
      });

      worksheetData.push([]); 
      worksheetData.push(['Total Laporan:', sortedLaporanList.length]);
      worksheetData.push(['Total Truk:', totalTrukReal]); 

      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const objectMaxLength = [];
      worksheetData.forEach(arr => {
        arr.forEach((col, key) => {
             const value = col ? col.toString().length : 10;
             objectMaxLength[key] = Math.max(objectMaxLength[key] || 10, value);
        });
      });
      ws['!cols'] = objectMaxLength.map(w => ({ width: Math.min(w + 2, 50) }));

      XLSX.utils.book_append_sheet(workbook, ws, 'Laporan Pembersihan');
      XLSX.writeFile(workbook, `Laporan_Truk_Air_${kegiatan.no_po}_${Date.now()}.xlsx`);
      setTimeout(() => { setIsProcessing(false); onClose(); }, 500);

    } catch (error) {
      console.error(error);
      alert('Gagal Excel: ' + error.message);
      setIsProcessing(false);
    }
  };

  // ===== DOWNLOAD PDF =====
  const downloadPDF = async () => {
    setIsProcessing(true);
    setLoadingStatus('Persiapan PDF...');

    try {
      let photoCache = new Map();
      if (includePhotos) photoCache = await preloadAllPhotos(sortedLaporanList);
      
      setLoadingStatus('Menyusun Halaman...');
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      // HEADER
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text('LAPORAN PEMBERSIHAN JALAN', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // INFO PO
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      
      doc.text(`No PO: ${cleanText(kegiatan.no_po)}`, 14, yPos);
      doc.text(`Vendor: ${cleanText(kegiatan.nama_vendor)}`, 140, yPos); 
      yPos += 6;
      doc.text(`Material: ${cleanText(kegiatan.material)}`, 14, yPos);
      doc.text(`Transporter: ${cleanText(headerTransporterName)}`, 140, yPos);
      yPos += 10;

      // KONFIGURASI TABEL
      const tableHead = ['No', 'Tanggal', 'Petugas (HP)', 'Area'];

      if (hasMultipleTransporters) {
        tableHead.push('Transporter');
      }

      tableHead.push('Plat No', 'Sebelum', 'Sedang', 'Setelah', 'Status');

      // 🔥 UPDATE LEBAR KOLOM "FULL WIDTH" (Target Total: 269mm)
      let columnStyles = {};

      if (hasMultipleTransporters) {
        // CASE: BANYAK TRANSPORTER (Total ~269mm)
        // Memaksimalkan setiap milimeter
        columnStyles = {
            0: { cellWidth: 10, halign: 'center' }, // No
            1: { cellWidth: 20, halign: 'center' }, // Tanggal
            2: { cellWidth: 32 },                   // Petugas
            3: { cellWidth: 28 },                   // Area
            4: { cellWidth: 27 },                   // Transporter
            5: { cellWidth: 22, halign: 'center' }, // Plat No
            6: { cellWidth: 35 },                   // Sebelum
            7: { cellWidth: 35 },                   // Sedang
            8: { cellWidth: 35 },                   // Setelah
            9: { cellWidth: 25, halign: 'center' }  // Status
        };
      } else {
        // CASE: SATU TRANSPORTER (Total ~269mm)
        // Kita lebarkan kolom Area dan Plat No secara signifikan
        columnStyles = {
            0: { cellWidth: 12, halign: 'center' }, // No
            1: { cellWidth: 23, halign: 'center' }, // Tanggal
            2: { cellWidth: 37 },                   // Petugas
            3: { cellWidth: 45 },                   // Area (Sangat Lebar)
            4: { cellWidth: 32, halign: 'center' }, // Plat No (Lebar)
            5: { cellWidth: 30 },                   // Sebelum
            6: { cellWidth: 30 },                   // Sedang
            7: { cellWidth: 30 },                   // Setelah
            8: { cellWidth: 30, halign: 'center' }  // Status (Sangat Lebar)
        };
      }

      const tableData = sortedLaporanList.map((lap, index) => {
        const row = [
          index + 1,
          formatDate(lap.created_at),
          `${cleanText(lap.nama_petugas)}\n(${cleanText(lap.no_telp_petugas)})`,
          cleanText(lap.lokasi_pembersihan)
        ];

        if (hasMultipleTransporters) {
          row.push(cleanText(lap.nama_transporter));
        }

        row.push(
          formatMultiLine(lap.plat_nomor_truk_air),
          `${formatTime(lap.jam_foto_sebelum)}\n${cleanText(lap.lokasi_foto_sebelum)}`,
          `${formatTime(lap.jam_foto_sedang)}\n${cleanText(lap.lokasi_foto_sedang)}`,
          `${formatTime(lap.jam_foto_setelah)}\n${cleanText(lap.lokasi_foto_setelah)}`,
          lap.status || '-'
        );
        return row;
      });

      autoTable(doc, {
        head: [tableHead],
        body: tableData,
        startY: yPos,
        theme: 'grid',
        margin: { left: 14, right: 14 },
        headStyles: { 
            fillColor: [220, 38, 38], 
            textColor: [255, 255, 255], 
            fontSize: 9, 
            halign: 'center', 
            valign: 'middle' 
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 3, 
            valign: 'top', 
            overflow: 'linebreak',
            textColor: 20 
        },
        columnStyles: columnStyles, 
        foot: [
            [
                { content: 'Total Laporan:', colSpan: hasMultipleTransporters ? 9 : 8, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: sortedLaporanList.length, styles: { halign: 'center', fontStyle: 'bold' } }
            ],
            [
                { content: 'Total Truk:', colSpan: hasMultipleTransporters ? 9 : 8, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: totalTrukReal, styles: { halign: 'center', fontStyle: 'bold' } }
            ]
        ],
        footStyles: {
            fillColor: [255, 255, 255], 
            textColor: 20,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
      });

      // HALAMAN FOTO
      if (includePhotos && sortedLaporanList.length > 0) {
        for (let i = 0; i < sortedLaporanList.length; i++) {
          const lap = sortedLaporanList[i];
          
          let allReportPhotos = [];
          const addPhotos = (str, labelBase, time, loc) => {
            const paths = getPhotoPaths(str);
            paths.forEach((p, idx) => {
                const label = paths.length > 1 ? `${labelBase} (${idx + 1})` : labelBase;
                allReportPhotos.push({ label, path: p, time, loc });
            });
          };

          addPhotos(lap.foto_truk_air, 'Truk Air', null, null);
          addPhotos(lap.foto_sebelum, 'Sebelum', lap.jam_foto_sebelum, lap.lokasi_foto_sebelum);
          addPhotos(lap.foto_sedang, 'Sedang', lap.jam_foto_sedang, lap.lokasi_foto_sedang);
          addPhotos(lap.foto_setelah, 'Setelah', lap.jam_foto_setelah, lap.lokasi_foto_setelah);

          if (allReportPhotos.length === 0) continue;

          const photosPerPage = 4;
          const totalPages = Math.ceil(allReportPhotos.length / photosPerPage);

          for (let pIdx = 0; pIdx < totalPages; pIdx++) {
            doc.addPage();
            yPos = 12;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38);
            const pageInfo = totalPages > 1 ? `(Hal ${pIdx + 1}/${totalPages})` : '';
            doc.text(`DOKUMENTASI FOTO - LAPORAN ${i + 1} ${pageInfo}`, pageWidth / 2, yPos, { align: 'center' });
            
            yPos += 6;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0);
            
            let infoText = `Petugas: ${cleanText(lap.nama_petugas)} | Plat No: ${cleanText(lap.plat_nomor_truk_air)}`;
            if (hasMultipleTransporters) infoText += ` | ${cleanText(lap.nama_transporter)}`;
            infoText += ` | Waktu: ${formatDateTime(lap.created_at)}`;

            doc.text(infoText, pageWidth / 2, yPos, { align: 'center' });
            
            yPos += 8;

            const start = pIdx * photosPerPage;
            const currentPhotos = allReportPhotos.slice(start, start + photosPerPage);

            const imgW = 125;
            const imgH = 75;
            const marginX = 15;
            const spcX = 10;
            const spcY = 18;

            currentPhotos.forEach((photo, idx) => {
                const row = Math.floor(idx / 2); 
                const col = idx % 2;
                const x = marginX + col * (imgW + spcX);
                const y = yPos + row * (imgH + spcY);

                const fullUrl = getPhotoUrl(photo.path);
                if (fullUrl && photoCache.has(fullUrl)) {
                    try {
                        const base64 = photoCache.get(fullUrl);
                        doc.addImage(base64, 'JPEG', x, y, imgW, imgH);
                        doc.setDrawColor(200);
                        doc.rect(x, y, imgW, imgH);
                    } catch (e) {
                        doc.rect(x, y, imgW, imgH);
                        doc.text('Error Gambar', x + 40, y + 35);
                    }
                } else {
                    doc.setDrawColor(200);
                    doc.setFillColor(245, 245, 245);
                    doc.rect(x, y, imgW, imgH, 'FD');
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text('Tidak ada foto', x + 40, y + 35);
                }

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(220, 38, 38);
                doc.text(photo.label, x, y - 2);

                if (photo.time || photo.loc) {
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(60);
                    let metaY = y + imgH + 3;
                    
                    if (photo.time) {
                        doc.text(`Jam: ${formatTime(photo.time)} WIB`, x, metaY);
                        metaY += 3;
                    }
                    if (photo.loc) {
                        const cleanLoc = cleanText(photo.loc);
                        const locLines = doc.splitTextToSize(`Lokasi: ${cleanLoc}`, imgW);
                        doc.text(locLines, x, metaY);
                    }
                }
            });
          }
        }
      }

      doc.save(`Laporan_Truk_Air_${kegiatan.no_po}_${Date.now()}.pdf`);
      setTimeout(() => { setIsProcessing(false); onClose(); }, 500);

    } catch (error) {
      console.error(error);
      alert('Gagal PDF: ' + error.message);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => selectedFormat === 'excel' ? downloadExcel() : downloadPDF();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Download Laporan</h2>
          <button onClick={onClose} disabled={isProcessing}>
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 border">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">No PO:</span>
              <span className="font-bold">{kegiatan?.no_po}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Transporter:</span>
              <span className="font-medium text-right max-w-[200px] leading-tight">{headerTransporterName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Laporan:</span>
              <span className="font-bold text-red-600">{sortedLaporanList.length || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Truk:</span>
              <span className="font-bold text-blue-600">{totalTrukReal}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setSelectedFormat('pdf')} 
              disabled={isProcessing}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedFormat === 'pdf' 
                  ? 'border-red-600 bg-red-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <p className="text-center font-bold text-sm">PDF</p>
            </button>
            <button 
              onClick={() => setSelectedFormat('excel')} 
              disabled={isProcessing}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedFormat === 'excel' 
                  ? 'border-green-600 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileSpreadsheet className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-center font-bold text-sm">Excel</p>
            </button>
          </div>

          <div 
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => !isProcessing && setIncludePhotos(!includePhotos)}
          >
            <input 
              type="checkbox" 
              checked={includePhotos} 
              onChange={(e) => setIncludePhotos(e.target.checked)} 
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer" 
              disabled={isProcessing}
            />
            <div className="flex-1">
              <span className="text-sm font-medium block">Sertakan Foto Dokumentasi</span>
              <span className="text-xs text-gray-500">Lampirkan semua foto dalam laporan</span>
            </div>
          </div>

          {isProcessing && (
            <div className="bg-amber-50 p-4 rounded-lg flex items-center gap-3 border border-amber-200">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">{loadingStatus}</p>
                <p className="text-xs text-amber-600 mt-1">Mohon tunggu...</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex gap-3">
          <button 
            onClick={onClose} 
            disabled={isProcessing} 
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button 
            onClick={handleDownload} 
            disabled={isProcessing || !laporanList || laporanList.length === 0} 
            className="flex-[2] py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isProcessing ? 'Memproses...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnduhLaporanTrukAir;