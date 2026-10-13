import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { RestaurantTable, Restaurant } from '../types';
import { Download, Printer, X, Copy, Check, ExternalLink, Image as ImageIcon, Sparkles, Layers } from 'lucide-react';
import { useToast } from './Toast';

interface TableQRModalProps {
  table?: RestaurantTable | null;
  restaurant: Restaurant;
  allTables?: RestaurantTable[];
  isAllMode?: boolean;
  onClose: () => void;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({
  table,
  restaurant,
  allTables = [],
  isAllMode = false,
  onClose
}) => {
  const { showToast } = useToast();
  const [singleQrUrl, setSingleQrUrl] = useState<string>('');
  const [allQrUrls, setAllQrUrls] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);
  const [downloadingBatch, setDownloadingBatch] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const getTableUrl = (tableNum: number) => {
    return `${window.location.origin}/menu/${restaurant.slug}/table/${tableNum}`;
  };

  useEffect(() => {
    if (!isAllMode && table) {
      const url = getTableUrl(table.table_number);
      QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(setSingleQrUrl)
        .catch(console.error);
    } else if (isAllMode && allTables.length > 0) {
      const generateAll = async () => {
        const urls: Record<number, string> = {};
        for (const t of allTables) {
          const url = getTableUrl(t.table_number);
          urls[t.table_number] = await QRCode.toDataURL(url, {
            width: 360,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' }
          });
        }
        setAllQrUrls(urls);
      };
      generateAll();
    }
  }, [table, isAllMode, allTables, restaurant.slug]);

  /**
   * Generates a high-resolution, print-ready Standee Card (PNG) on HTML5 Canvas.
   * Prominently displays "TABLE T{tableNum}", Restaurant Name, WiFi, QR Code, and instructions.
   */
  const generateStandeeCardBlob = async (tableNum: number, qrDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1420;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(qrDataUrl);

      // 1. Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Outer decorative border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

      // 3. Top accent gradient band
      const grad = ctx.createLinearGradient(0, 16, canvas.width, 16);
      grad.addColorStop(0, '#ff4d2e');
      grad.addColorStop(1, '#f97316');
      ctx.fillStyle = grad;
      ctx.fillRect(16, 16, canvas.width - 32, 26);

      // 4. Restaurant Name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(restaurant.name || 'Restaurant', canvas.width / 2, 115);

      // Subtitle
      ctx.fillStyle = '#64748b';
      ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Contactless Digital Menu & Table Ordering', canvas.width / 2, 155);

      // 5. GIANT PROMINENT TABLE BADGE (e.g. TABLE T1)
      const badgeW = 420;
      const badgeH = 80;
      const badgeX = (canvas.width - badgeW) / 2;
      const badgeY = 185;

      ctx.fillStyle = '#ff4d2e';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 40);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();

      // Bold text inside badge: TABLE T1
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`TABLE T${tableNum}`, canvas.width / 2, badgeY + 56);

      // 6. QR Code drawing
      const qrImg = new Image();
      qrImg.onload = () => {
        const qrSize = 540;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 295;

        // Clean white container for QR
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 28);
        } else {
          ctx.rect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
        }
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // 7. Instructions below QR
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Scan with Camera to View Menu & Order', canvas.width / 2, 915);

        ctx.fillStyle = '#64748b';
        ctx.font = '500 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Open Camera • Point at QR • Tap Notification', canvas.width / 2, 955);

        // 8. Info Box with Table Number confirmation & direct link
        const infoBoxY = 995;
        const infoBoxH = 270;
        ctx.fillStyle = '#fff7ed';
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(50, infoBoxY, canvas.width - 100, infoBoxH, 24);
        } else {
          ctx.rect(50, infoBoxY, canvas.width - 100, infoBoxH);
        }
        ctx.fill();
        ctx.stroke();

        // Confirmed table tag in info box
        ctx.fillStyle = '#c2410c';
        ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`⚡ ASSIGNED TO TABLE T${tableNum} (TABLE ${tableNum})`, canvas.width / 2, infoBoxY + 52);

        // Direct Table URL
        ctx.fillStyle = '#0f172a';
        ctx.font = '600 20px monospace';
        const tableUrl = getTableUrl(tableNum);
        ctx.fillText(tableUrl, canvas.width / 2, infoBoxY + 100);

        if (restaurant.wifi_info) {
          ctx.fillStyle = '#334155';
          ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(`Free Guest WiFi: ${restaurant.wifi_info}`, canvas.width / 2, infoBoxY + 152);
        }

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(
          'No app download required • Fast digital ordering directly to kitchen',
          canvas.width / 2,
          infoBoxY + (restaurant.wifi_info ? 208 : 175)
        );

        // 9. Footer
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('RestoQR Smart Dining System', canvas.width / 2, 1370);

        resolve(canvas.toDataURL('image/png'));
      };
      qrImg.onerror = () => resolve(qrDataUrl);
      qrImg.src = qrDataUrl;
    });
  };

  /**
   * Generates a compact labeled QR badge (PNG) with TABLE T{tableNum} clearly visible on the image.
   */
  const generateLabeledQrBlob = async (tableNum: number, qrDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 980;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(qrDataUrl);

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

      // Header Restaurant Name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(restaurant.name || 'Restaurant', canvas.width / 2, 68);

      // Prominent Table Badge
      const badgeW = 360;
      const badgeH = 68;
      const badgeX = (canvas.width - badgeW) / 2;
      const badgeY = 92;

      ctx.fillStyle = '#ff4d2e';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 34);
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH);
      }
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`TABLE T${tableNum}`, canvas.width / 2, badgeY + 48);

      // Draw QR Code
      const qrImg = new Image();
      qrImg.onload = () => {
        const qrSize = 560;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 185;

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Bottom label with Table number
        const botBoxY = 780;
        const botBoxH = 130;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(50, botBoxY, canvas.width - 100, botBoxH, 20);
        } else {
          ctx.rect(50, botBoxY, canvas.width - 100, botBoxH);
        }
        ctx.fill();

        ctx.fillStyle = '#ffedd5';
        ctx.font = '900 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`TABLE T${tableNum} • SCAN TO ORDER`, canvas.width / 2, botBoxY + 54);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`/menu/${restaurant.slug}/table/${tableNum}`, canvas.width / 2, botBoxY + 98);

        resolve(canvas.toDataURL('image/png'));
      };
      qrImg.onerror = () => resolve(qrDataUrl);
      qrImg.src = qrDataUrl;
    });
  };

  const handleCopyLink = (tableNum?: number) => {
    const num = tableNum || table?.table_number;
    if (!num) return;
    const url = getTableUrl(num);
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast(`Table T${num} menu link copied to clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Downloads a single high-res table standee card with TABLE T{num} visibly displayed.
   */
  const handleDownloadStandee = async (tableNum: number, qrUrl: string) => {
    try {
      showToast(`Generating Table T${tableNum} standee card...`, 'info');
      const cardPngUrl = await generateStandeeCardBlob(tableNum, qrUrl);
      const a = document.createElement('a');
      a.href = cardPngUrl;
      a.download = `${restaurant.slug}-Table-T${tableNum}-Standee.png`;
      a.click();
      showToast(`✅ Downloaded Table T${tableNum} Standee Card!`, 'success');
    } catch (e) {
      console.error(e);
      showToast(`Failed to download Table T${tableNum}`, 'error');
    }
  };

  /**
   * Downloads a compact labeled QR badge with TABLE T{num} visibly displayed.
   */
  const handleDownloadQrBadge = async (tableNum: number, qrUrl: string) => {
    try {
      showToast(`Generating Table T${tableNum} labeled QR...`, 'info');
      const qrPngUrl = await generateLabeledQrBlob(tableNum, qrUrl);
      const a = document.createElement('a');
      a.href = qrPngUrl;
      a.download = `${restaurant.slug}-Table-T${tableNum}-QR.png`;
      a.click();
      showToast(`✅ Downloaded Table T${tableNum} QR badge!`, 'success');
    } catch (e) {
      console.error(e);
      showToast(`Failed to download Table T${tableNum}`, 'error');
    }
  };

  /**
   * Batch download standee cards for all tables in one click!
   */
  const handleBatchDownloadAllStandees = async () => {
    if (allTables.length === 0) return;
    setDownloadingBatch(true);
    showToast(`Starting download for all ${allTables.length} tables with Table T1, T2... labels!`, 'info');

    try {
      for (let i = 0; i < allTables.length; i++) {
        const t = allTables[i];
        const qrUrl = allQrUrls[t.table_number] || (await QRCode.toDataURL(getTableUrl(t.table_number), { width: 360, margin: 2 }));
        const cardPngUrl = await generateStandeeCardBlob(t.table_number, qrUrl);
        const a = document.createElement('a');
        a.href = cardPngUrl;
        a.download = `${restaurant.slug}-Table-T${t.table_number}-Standee.png`;
        a.click();
        // Brief delay so browser handles each file download cleanly
        await new Promise((r) => setTimeout(r, 350));
      }
      showToast(`🎉 Successfully downloaded all ${allTables.length} table cards!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Error during batch download', 'error');
    } finally {
      setDownloadingBatch(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#ff4d2e] font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {isAllMode ? `All ${allTables.length} Tables` : `Table T${table?.table_number}`}
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs text-slate-500 font-semibold">{restaurant.name}</span>
            </div>
            <h3 className="font-black text-xl text-slate-900">
              {isAllMode ? `Print & Download All Table QR Cards (${allTables.length} Tables)` : `Table T${table?.table_number} QR Card & Standee`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAllMode
                ? 'High-resolution printable standees with Table T1, T2... clearly printed on every card'
                : `Every QR download includes prominent "TABLE T${table?.table_number}" branding so you know exactly which table it belongs to`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50" ref={printAreaRef}>
          {!isAllMode && table && (
            <div className="flex flex-col items-center">
              {/* Standee Card Preview */}
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md max-w-sm w-full text-center flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-[#ff4d2e] to-orange-500" />

                <img
                  src={restaurant.logo || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80'}
                  alt={restaurant.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm mb-2 mt-1"
                />

                <h4 className="text-lg font-black text-slate-900 tracking-tight">{restaurant.name}</h4>

                {/* PROMINENT TABLE BADGE */}
                <div className="my-3 px-6 py-2 bg-gradient-to-r from-[#ff4d2e] to-orange-500 text-white rounded-full font-black text-lg tracking-wider shadow-md shadow-[#ff4d2e]/25">
                  TABLE T{table.table_number}
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner my-2">
                  {singleQrUrl ? (
                    <img src={singleQrUrl} alt={`Table T${table.table_number} QR`} className="w-52 h-52 object-contain" />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-slate-100 text-slate-400 text-xs animate-pulse">
                      Generating QR...
                    </div>
                  )}
                </div>

                <p className="text-xs font-bold text-slate-800 mt-2">
                  Scan with Camera to View Menu & Order
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">No app download required</p>

                {restaurant.wifi_info && (
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-200 w-full text-[11px] text-slate-600">
                    <span className="font-bold text-slate-800">Free Guest WiFi:</span> {restaurant.wifi_info}
                  </div>
                )}

                <div className="mt-3 pt-2 text-[10px] text-slate-400 font-mono">
                  Assigned Table: T{table.table_number}
                </div>
              </div>

              {/* Direct Link bar */}
              <div className="mt-5 w-full max-w-sm flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 shadow-xs">
                <span className="truncate flex-1 font-mono text-[11px] font-semibold">{getTableUrl(table.table_number)}</span>
                <button
                  onClick={() => handleCopyLink(table.table_number)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Copy Table Menu Link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={getTableUrl(table.table_number)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Open Customer Menu in New Window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {isAllMode && (
            <div className="space-y-6">
              {/* Batch Action Bar */}
              <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#ff4d2e]" />
                    <span>Download All Table Cards ({allTables.length} Tables)</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Every file downloaded is stamped with its table number (e.g., Table T1, Table T2) so prints are never mixed up.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchDownloadAllStandees}
                    disabled={downloadingBatch}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-bold transition shadow-md shadow-[#ff4d2e]/20 disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{downloadingBatch ? 'Downloading All...' : 'Download All Standees'}</span>
                  </button>
                </div>
              </div>

              {/* Grid of All Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 print:grid-cols-2">
                {allTables.map(t => (
                  <div
                    key={t.id}
                    className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs text-center flex flex-col items-center relative overflow-hidden break-inside-avoid"
                  >
                    <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-[#ff4d2e] to-orange-500" />
                    <h4 className="text-base font-black text-slate-900 mt-1">{restaurant.name}</h4>

                    {/* Prominent Table Badge */}
                    <div className="my-2.5 px-5 py-1.5 bg-gradient-to-r from-[#ff4d2e] to-orange-500 text-white rounded-full font-black text-sm uppercase tracking-wider shadow-sm">
                      TABLE T{t.table_number}
                    </div>

                    {allQrUrls[t.table_number] ? (
                      <div className="p-2 bg-white border border-slate-100 rounded-2xl shadow-inner my-1">
                        <img
                          src={allQrUrls[t.table_number]}
                          alt={`Table T${t.table_number} QR`}
                          className="w-44 h-44 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center bg-slate-100 text-slate-400 text-xs rounded-2xl">
                        Generating...
                      </div>
                    )}

                    <p className="text-xs font-bold text-slate-800 mt-1">Scan to View Menu & Order</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-[240px]">
                      /menu/{restaurant.slug}/table/{t.table_number}
                    </p>

                    {restaurant.wifi_info && (
                      <p className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-dashed border-slate-100 w-full truncate">
                        WiFi: {restaurant.wifi_info}
                      </p>
                    )}

                    {/* Action buttons on each card */}
                    <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadStandee(t.table_number, allQrUrls[t.table_number])}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ff4d2e] font-black text-xs transition cursor-pointer border border-orange-200"
                        title={`Download Table T${t.table_number} Standee`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>T{t.table_number} Standee</span>
                      </button>
                      <button
                        onClick={() => handleDownloadQrBadge(t.table_number, allQrUrls[t.table_number])}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200"
                        title={`Download Table T${t.table_number} QR Code`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>T{t.table_number} QR</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Close
          </button>

          <div className="w-full sm:w-auto flex flex-wrap items-center justify-end gap-2.5">
            {!isAllMode && table && (
              <>
                <button
                  onClick={() => handleDownloadQrBadge(table.table_number, singleQrUrl)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Download compact QR code with Table T badge"
                >
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  <span>Download QR (Table T{table.table_number})</span>
                </button>
                <button
                  onClick={() => handleDownloadStandee(table.table_number, singleQrUrl)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-black transition shadow-md shadow-[#ff4d2e]/25 cursor-pointer"
                  title="Download full high-resolution standee card with Table T badge"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Standee (Table T{table.table_number})</span>
                </button>
              </>
            )}

            {isAllMode && (
              <button
                onClick={handleBatchDownloadAllStandees}
                disabled={downloadingBatch}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff4d2e] hover:bg-[#e03d1e] text-white text-xs font-black transition shadow-md shadow-[#ff4d2e]/25 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download All Standees ({allTables.length})</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAllMode ? 'Print All Standees' : `Print Table T${table?.table_number}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
