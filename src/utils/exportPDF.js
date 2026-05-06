import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_W = 210;
const PAGE_H = 297;
const M = 12;
const CW = PAGE_W - M * 2;

function statusLabel(s) {
  return { pendiente: 'Pendiente', en_ejecucion: 'En ejecución', completado: 'Completado', bloqueado: 'Bloqueado' }[s] || s || '—';
}
function releaseLabel(s) {
  return { liberado: 'Liberado', no_liberado: 'No liberado', parcial: 'Parcial' }[s] || '—';
}

function drawProgressBar(doc, x, y, w, h, pct) {
  const fillColor = pct >= 80 ? [34, 150, 60] : pct >= 50 ? [210, 130, 0] : [200, 50, 50];
  doc.setFillColor(220, 225, 235);
  doc.roundedRect(x, y, w, h, 0.8, 0.8, 'F');
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w * Math.min(pct / 100, 1), h, 0.8, 0.8, 'F');
}

function addPageHeader(doc, today, logoData) {
  doc.setFillColor(13, 27, 64);
  doc.rect(0, 0, PAGE_W, 10, 'F');
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 9.5, PAGE_W, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 230);
  doc.text(`INFORME DE AVANCE DE OBRA  ·  ${today}`, M, 7);
  if (logoData) {
    const lH = 7;
    const lW = lH * logoData.aspect;
    doc.addImage(logoData.dataUrl, 'PNG', PAGE_W - M - lW, 1.5, lW, lH);
  }
  return 16;
}

function addSectionTitle(doc, text, y) {
  doc.setFillColor(230, 235, 248);
  doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
  doc.setFillColor(13, 27, 64);
  doc.roundedRect(M, y, 3, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(13, 27, 64);
  doc.text(text, M + 7, y + 5.5);
  return y + 12;
}

async function renderPhotos(doc, photos, y, today, logoData) {
  if (photos.length === 0) return y;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(40, 60, 110);
  doc.text(`Fotos (${photos.length}):`, M + 4, y);
  y += 4;

  const photoW = (CW - 10) / 3;
  const photoH = 36;
  let photoCol = 0;
  let rowStartY = y;

  for (const photo of photos) {
    if (!photo.file_url) continue;
    if (photoCol === 0) {
      if (y + photoH + 10 > PAGE_H - 14) {
        doc.addPage();
        y = addPageHeader(doc, today, logoData);
      }
      rowStartY = y;
    }
    const px = M + 4 + photoCol * (photoW + 3);
    const py = rowStartY;

    await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        doc.setDrawColor(200, 205, 215);
        doc.setLineWidth(0.3);
        doc.roundedRect(px, py, photoW, photoH, 1.5, 1.5, 'S');
        const aspect = img.width / img.height;
        let iW = photoW - 2; let iH = iW / aspect;
        if (iH > photoH - 2) { iH = photoH - 2; iW = iH * aspect; }
        doc.addImage(img, 'JPEG', px + (photoW - iW) / 2, py + 1, iW, iH);
        resolve();
      };
      img.onerror = () => {
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(px, py, photoW, photoH, 1.5, 1.5, 'F');
        doc.setFontSize(6); doc.setTextColor(150, 150, 150);
        doc.text('[no disponible]', px + photoW / 2, py + photoH / 2, { align: 'center' });
        resolve();
      };
      img.src = photo.file_url;
    });

    if (photo.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(120, 120, 120);
      doc.text(photo.description.substring(0, 30), px + photoW / 2, py + photoH + 3.5, { align: 'center' });
    }

    photoCol++;
    if (photoCol >= 3) { photoCol = 0; y = rowStartY + photoH + 7; }
  }
  if (photoCol > 0) y = rowStartY + photoH + 7;
  return y;
}

const LOGO_URL = 'https://media.base44.com/images/public/69c135c57c9886fec79cebc5/630dfa8aa_logoclientes-8.png';

async function loadLogoDataUrl() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), aspect: img.width / img.height });
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
}

export async function exportReportPDF(masterItems, dailyLogs, sitePhotos = [], checklistEntries = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const todayShort = format(new Date(), 'yyyy-MM-dd');

  const logoData = await loadLogoDataUrl();

  // ── KPIs globales ──────────────────────────────────────────────────────────
  const totalPlanned = masterItems.reduce((s, i) => s + (i.planned_qty || 0), 0);
  const totalExecuted = masterItems.reduce((s, i) => s + (i.executed_qty || 0), 0);
  const globalPct = totalPlanned > 0 ? (totalExecuted / totalPlanned) * 100 : 0;
  const completados = masterItems.filter(i => i.status === 'completado').length;
  const bloqueados = masterItems.filter(i => i.status === 'bloqueado').length;
  const enEjecucion = masterItems.filter(i => i.status === 'en_ejecucion').length;
  const sortedAllLogs = [...dailyLogs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const lastLogDate = sortedAllLogs[0]?.date || '—';

  // Agrupar por proyecto
  const byProject = {};
  masterItems.forEach(item => {
    const p = item.project || 'Sin proyecto';
    if (!byProject[p]) byProject[p] = [];
    byProject[p].push(item);
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 1: PORTADA + RESUMEN GLOBAL
  // ══════════════════════════════════════════════════════════════
  doc.setFillColor(13, 27, 64);
  doc.rect(0, 0, PAGE_W, 35, 'F');
  doc.setFillColor(234, 179, 8);
  doc.rect(0, 34.5, PAGE_W, 2, 'F');

  // Logo en portada (esquina superior derecha)
  if (logoData) {
    const logoH = 20;
    const logoW = logoH * logoData.aspect;
    doc.addImage(logoData.dataUrl, 'PNG', PAGE_W - M - logoW, 7, logoW, logoH);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('INFORME DE AVANCE DE OBRA', M, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 200, 230);
  doc.text(`Obras Eléctricas  ·  ${today}  ·  Último reporte: ${lastLogDate}`, M, 26);

  let y = 44;

  // KPI cards
  const kpis = [
    { label: 'Avance Global', value: `${globalPct.toFixed(1)}%`, color: globalPct >= 80 ? [34, 150, 60] : globalPct >= 50 ? [210, 130, 0] : [200, 50, 50] },
    { label: 'Total Ítems', value: masterItems.length, color: [40, 60, 110] },
    { label: 'En Ejecución', value: enEjecucion, color: [30, 100, 200] },
    { label: 'Completados', value: completados, color: [34, 150, 60] },
    { label: 'Bloqueados', value: bloqueados, color: [200, 50, 50] },
    { label: 'Reportes Diarios', value: dailyLogs.length, color: [80, 80, 80] },
  ];
  const kpiW = CW / 3 - 2;
  const kpiH = 16;
  kpis.forEach((k, i) => {
    const col = i % 3; const row = Math.floor(i / 3);
    const kx = M + col * (kpiW + 3);
    const ky = y + row * (kpiH + 3);
    doc.setFillColor(248, 250, 254);
    doc.roundedRect(kx, ky, kpiW, kpiH, 1.5, 1.5, 'F');
    doc.setFillColor(...k.color);
    doc.roundedRect(kx, ky, 2.5, kpiH, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.setTextColor(...k.color);
    doc.text(String(k.value), kx + 9, ky + 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.setTextColor(100, 110, 130);
    doc.text(k.label, kx + 9, ky + 14.5);
  });
  y += kpiH * 2 + 12;

  // Barra avance global
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  doc.setTextColor(40, 60, 110);
  doc.text(`AVANCE GLOBAL: ${globalPct.toFixed(1)}%`, M, y);
  y += 3;
  drawProgressBar(doc, M, y, CW, 5, globalPct);
  y += 14;

  // Tabla resumen por proyecto
  y = addSectionTitle(doc, 'RESUMEN POR PROYECTO', y);

  for (const [projectName, items] of Object.entries(byProject)) {
    const projPlanned = items.reduce((s, i) => s + (i.planned_qty || 0), 0);
    const projExecuted = items.reduce((s, i) => s + (i.executed_qty || 0), 0);
    const projPct = projPlanned > 0 ? (projExecuted / projPlanned * 100) : 0;
    const projLogs = dailyLogs.filter(l => l.project === projectName).length;

    if (y + 8 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }

    doc.setFillColor(245, 247, 253);
    doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
    doc.setDrawColor(210, 220, 240); doc.setLineWidth(0.15);
    doc.roundedRect(M, y, CW, 8, 1, 1, 'S');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
    doc.setTextColor(13, 27, 64);
    doc.text(projectName, M + 3, y + 5.5);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.setTextColor(80, 90, 120);
    doc.text(`${items.length} ítems  ·  ${projLogs} reportes`, M + 80, y + 5.5);

    drawProgressBar(doc, M + 120, y + 2.5, 50, 3, projPct);

    const pctColor = projPct >= 80 ? [34, 150, 60] : projPct >= 50 ? [210, 130, 0] : [200, 50, 50];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.setTextColor(...pctColor);
    doc.text(`${projPct.toFixed(1)}%`, M + CW - 3, y + 5.5, { align: 'right' });

    y += 10;
  }

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 2: DETALLE POR PROYECTO (agrupado)
  // ══════════════════════════════════════════════════════════════
  for (const [projectName, items] of Object.entries(byProject)) {
    doc.addPage();
    y = addPageHeader(doc, today, logoData);

    // Encabezado de proyecto
    doc.setFillColor(13, 27, 64);
    doc.roundedRect(M, y, CW, 14, 2, 2, 'F');
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(M, y + 12, CW, 2, 0, 0, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(projectName, M + 4, y + 9);

    const projPlanned = items.reduce((s, i) => s + (i.planned_qty || 0), 0);
    const projExecuted = items.reduce((s, i) => s + (i.executed_qty || 0), 0);
    const projPct = projPlanned > 0 ? (projExecuted / projPlanned * 100) : 0;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.setTextColor(180, 200, 230);
    doc.text(`${projPct.toFixed(1)}% avance  ·  ${projExecuted}/${projPlanned} und  ·  ${items.length} ítems`, M + CW - 3, y + 9, { align: 'right' });
    y += 20;

    // Tabla de ítems del proyecto
    // Cabecera de tabla
    doc.setFillColor(60, 80, 140);
    doc.rect(M, y, CW, 7, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Torre / Piso / Actividad', M + 3, y + 5);
    doc.text('Cuadrilla', M + 80, y + 5);
    doc.text('Ejec / Plan', M + 115, y + 5);
    doc.text('Avance', M + 140, y + 5);
    doc.text('Estado', M + 168, y + 5);
    y += 7;

    for (const item of items) {
      if (y + 8 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
      const pct = item.planned_qty > 0 ? ((item.executed_qty || 0) / item.planned_qty * 100) : 0;
      const rowBg = items.indexOf(item) % 2 === 0 ? [250, 251, 255] : [243, 245, 252];
      doc.setFillColor(...rowBg);
      doc.rect(M, y, CW, 8, 'F');
      doc.setDrawColor(215, 220, 235); doc.setLineWidth(0.1);
      doc.line(M, y + 8, M + CW, y + 8);

      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(20, 30, 50);
      const itemLabel = [item.tower, item.floor, item.activity].filter(Boolean).join(' · ');
      doc.text(itemLabel.substring(0, 38), M + 3, y + 5.5);

      doc.setTextColor(60, 70, 100);
      doc.text((item.crew_name || '—').substring(0, 18), M + 80, y + 5.5);
      doc.text(`${item.executed_qty || 0} / ${item.planned_qty || 0} ${item.unit || 'und'}`, M + 115, y + 5.5);

      drawProgressBar(doc, M + 140, y + 3, 24, 3, pct);

      const stColors = { pendiente: [120, 120, 120], en_ejecucion: [30, 100, 200], completado: [34, 150, 60], bloqueado: [200, 50, 50] };
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.setTextColor(...(stColors[item.status] || [100, 100, 100]));
      doc.text(statusLabel(item.status), M + 168, y + 5.5);
      y += 8;
    }
    y += 4;

    // Ítems con restricción activa (resumen)
    const itemsConRestriccion = items.filter(i => i.restrictions);
    if (itemsConRestriccion.length > 0) {
      if (y + 10 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
      y = addSectionTitle(doc, `RESTRICCIONES ACTIVAS (${itemsConRestriccion.length})`, y);
      for (const item of itemsConRestriccion) {
        if (y + 10 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
        doc.setFillColor(255, 243, 240);
        const rLines = doc.splitTextToSize(`${[item.tower, item.floor, item.activity].filter(Boolean).join(' · ')}: ${item.restrictions}`, CW - 10);
        const rH = rLines.length * 4 + 5;
        doc.roundedRect(M, y, CW, rH, 1, 1, 'F');
        doc.setDrawColor(220, 60, 60); doc.setLineWidth(0.2);
        doc.roundedRect(M, y, CW, rH, 1, 1, 'S');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(160, 40, 40);
        doc.text(rLines, M + 4, y + 4.5);
        y += rH + 3;
      }
      y += 4;
    }

    // Fotos del proyecto
    const projPhotos = sitePhotos.filter(p => {
      const mi = masterItems.find(i => i.id === p.master_item_id);
      return mi?.project === projectName;
    });
    if (projPhotos.length > 0) {
      if (y + 10 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
      y = addSectionTitle(doc, `FOTOS DE OBRA`, y);
      y = await renderPhotos(doc, projPhotos, y, today, logoData);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 3: REPORTES DIARIOS (todos, ordenados por fecha desc)
  // ══════════════════════════════════════════════════════════════
  if (sortedAllLogs.length > 0) {
    doc.addPage();
    y = addPageHeader(doc, today, logoData);

    // Encabezado de sección
    doc.setFillColor(13, 27, 64);
    doc.roundedRect(M, y, CW, 14, 2, 2, 'F');
    doc.setFillColor(234, 179, 8);
    doc.roundedRect(M, y + 12, CW, 2, 0, 0, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('REPORTES DIARIOS', M + 4, y + 9);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
    doc.setTextColor(180, 200, 230);
    doc.text(`${sortedAllLogs.length} registros  ·  Último: ${lastLogDate}`, M + CW - 3, y + 9, { align: 'right' });
    y += 20;

    for (const log of sortedAllLogs) {
      const logItem = masterItems.find(i => i.id === log.master_item_id);
      const logPhotos = sitePhotos.filter(p =>
        p.daily_log_id === log.id ||
        (p.master_item_id === log.master_item_id && p.date === log.date)
      );

      if (y + 28 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }

      // Encabezado del log
      doc.setFillColor(45, 70, 140);
      doc.roundedRect(M, y, CW, 8, 1, 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      const logTitle = [log.date, log.project, log.tower, log.floor, log.activity].filter(Boolean).join('  ·  ');
      doc.text(logTitle, M + 3, y + 5.5);
      if (log.supervisor) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
        doc.setTextColor(180, 200, 230);
        doc.text(`Supervisor: ${log.supervisor}`, M + CW - 3, y + 5.5, { align: 'right' });
      }
      y += 10;

      // Métricas
      doc.setFillColor(245, 248, 255);
      doc.roundedRect(M, y, CW, 10, 1, 1, 'F');
      doc.setDrawColor(210, 220, 240); doc.setLineWidth(0.15);
      doc.roundedRect(M, y, CW, 10, 1, 1, 'S');
      const mW = CW / 4;
      const metrics = [
        ['Ejecutado hoy', `${log.executed_today ?? 0} ${logItem?.unit || 'und'}`],
        ['Horas trabajadas', `${log.hours_worked || 0}h`],
        ['Personal', `${log.crew_workers?.length || 0} pers.`],
        ['Restricción', log.has_restriction ? '⚠ Sí' : 'No'],
      ];
      metrics.forEach(([label, val], i) => {
        const mx = M + i * mW + 3;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(100, 110, 130);
        doc.text(label, mx, y + 4);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
        if (label === 'Restricción' && log.has_restriction) doc.setTextColor(200, 50, 50);
        else doc.setTextColor(20, 40, 90);
        doc.text(val, mx, y + 9);
      });
      y += 12;

      // Personal del día
      if (log.crew_workers?.length > 0) {
        if (y + 5 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(60, 80, 120);
        doc.text('Personal presente:', M + 4, y + 3);
        y += 6;
        // Tabla compacta de personal
        log.crew_workers.forEach((w, wi) => {
          if (y + 4.5 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
          if (wi % 2 === 0) { doc.setFillColor(248, 250, 254); } else { doc.setFillColor(255, 255, 255); }
          doc.rect(M + 4, y - 1, CW - 4, 4.5, 'F');
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(40, 40, 40);
          doc.text(`${w.name || '—'}`, M + 7, y + 2.5);
          doc.setTextColor(80, 90, 120);
          doc.text(w.role || '—', M + 65, y + 2.5);
          if (w.hours) doc.text(`${w.hours}h`, M + 110, y + 2.5);
          if (w.executed) doc.text(`${w.executed} und`, M + 130, y + 2.5);
          y += 4.5;
        });
        y += 2;
      }

      // Restricción detalle
      if (log.has_restriction && log.restriction_detail) {
        if (y + 10 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
        doc.setFillColor(255, 243, 240);
        const rLines = doc.splitTextToSize(`⚠ ${log.restriction_detail}`, CW - 10);
        const rH = rLines.length * 4 + 5;
        doc.roundedRect(M, y, CW, rH, 1, 1, 'F');
        doc.setDrawColor(220, 60, 60); doc.setLineWidth(0.2);
        doc.roundedRect(M, y, CW, rH, 1, 1, 'S');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(180, 40, 40);
        doc.text(rLines, M + 4, y + 4.5);
        y += rH + 3;
      }

      // Observaciones
      if (log.observations) {
        if (y + 8 > PAGE_H - 14) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
        doc.setFillColor(245, 248, 255);
        const oLines = doc.splitTextToSize(log.observations, CW - 10);
        const oH = oLines.length * 4 + 5;
        doc.roundedRect(M, y, CW, oH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(40, 60, 110);
        doc.text('Obs:', M + 4, y + 4.5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 60, 80);
        doc.text(oLines, M + 14, y + 4.5);
        y += oH + 3;
      }

      // Fotos del reporte
      if (logPhotos.length > 0) {
        y = await renderPhotos(doc, logPhotos, y, today, logoData);
      }

      // Separador
      y += 2;
      doc.setDrawColor(200, 210, 235); doc.setLineWidth(0.15);
      doc.line(M, y, M + CW, y);
      y += 5;
    }
  }

  // ── Pie de página / cierre ─────────────────────────────────────────────────
  if (y + 20 > PAGE_H - 12) { doc.addPage(); y = addPageHeader(doc, today, logoData); }
  y += 6;
  doc.setDrawColor(210, 218, 235); doc.setLineWidth(0.3);
  doc.line(M, y, M + CW, y);
  y += 5;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(80, 90, 110);
  doc.text('Leyenda:', M, y);
  const legends = [
    { color: [34, 150, 60], label: 'Completado / ≥80%' },
    { color: [210, 130, 0], label: 'En seguimiento / 50–79%' },
    { color: [200, 50, 50], label: 'Bajo meta / <50%' },
  ];
  let lx = M + 22;
  legends.forEach(l => {
    doc.setFillColor(...l.color);
    doc.rect(lx, y - 3, 3, 3, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(80, 90, 110);
    doc.text(l.label, lx + 4.5, y);
    lx += 52;
  });

  y += 8;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(150, 150, 150);
  doc.text(`Documento generado automáticamente · ${format(new Date(), "dd/MM/yyyy HH:mm")}`, PAGE_W / 2, y, { align: 'center' });

  doc.save(`informe_avance_${todayShort}.pdf`);
}