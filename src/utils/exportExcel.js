import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const LOGO_URL = 'https://media.base44.com/images/public/69c135c57c9886fec79cebc5/6324de60d_logoclientes-8.png';

/** @type {import('exceljs').FillPattern} */
const headerFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF142952' }, // Azul primary
};

const headerFont = {
  color: { argb: 'FFFFFFFF' },
  bold: true,
  size: 12,
};

/** @type {Partial<import('exceljs').Borders>} */
const thinBorder = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

/** @type {import('exceljs').FillPattern} */
const subtitleFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFDE8D8' },
};

/** @param {import('exceljs').Row} row */
function styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });
  row.height = 28;
}

/** @param {import('exceljs').Worksheet} sheet @param {number} [startRow] */
function styleSheetRows(sheet, startRow = 4) {
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < startRow) return;
    const isEven = rowNumber % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder;
      const colNumber = Number(cell.col);
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 4 || colNumber === 5 ? 'left' : 'center', wrapText: true };
      if (isEven) {
        cell.fill = /** @type {import('exceljs').FillPattern} */ ({
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        });
      }
    });
  });
}

/**
 * @param {string|number|undefined} statusValue
 * @returns {{ fill: any; font: any }}
 */
function getStatusStyle(statusValue) {
  const statusVal = String(statusValue || '').toLowerCase();
  if (statusVal.includes('complet')) {
    return {
      fill: /** @type {import('exceljs').FillPattern} */ ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }),
      font: { color: { argb: 'FF047857' }, bold: true },
    };
  }
  if (statusVal.includes('ejec')) {
    return {
      fill: /** @type {import('exceljs').FillPattern} */ ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }),
      font: { color: { argb: 'FF1D4ED8' }, bold: true },
    };
  }
  if (statusVal.includes('bloque')) {
    return {
      fill: /** @type {import('exceljs').FillPattern} */ ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }),
      font: { color: { argb: 'FFB91C1C' }, bold: true },
    };
  }
  return {
    fill: /** @type {import('exceljs').FillPattern} */ ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }),
    font: { color: { argb: 'FF334155' }, bold: true },
  };
}

/** @param {import('exceljs').Worksheet} sheet @param {string} subtitle @param {string} lastColumn */
function styleTitleRows(sheet, subtitle, lastColumn) {
  const titleRow = sheet.getRow(1);
  titleRow.font = { size: 16, bold: true, color: { argb: 'FF111827' } };
  titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.mergeCells(`A1:${lastColumn}1`);
  titleRow.height = 24;

  const subtitleRow = sheet.getRow(2);
  subtitleRow.values = [subtitle];
  subtitleRow.font = { size: 11, color: { argb: 'FF1F2937' } };
  subtitleRow.fill = subtitleFill;
  subtitleRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  subtitleRow.eachCell((cell) => {
    cell.border = thinBorder;
  });
  sheet.mergeCells(`A2:${lastColumn}2`);
  subtitleRow.height = 20;
}

/** @param {import('exceljs').Workbook} workbook */
async function loadLogoImageId(workbook) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        resolve(workbook.addImage({ base64, extension: 'png' }));
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
}

/** @param {import('exceljs').Worksheet} sheet @param {number|null} imageId */
function insertLogo(sheet, imageId) {
  if (!imageId) return;
  sheet.addImage(imageId, {
    tl: { col: 9.5, row: 0.15 },
    ext: { width: 110, height: 30 },
  });
}

/**
 * @param {any[]} masterItems
 * @param {any[]} dailyLogs
 */
export async function exportReportExcel(masterItems, dailyLogs) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Control de Obras DGC';
  workbook.created = new Date();

  const logoImageId = await loadLogoImageId(workbook);

  const masterSheet = workbook.addWorksheet('Plan Maestro', {
    properties: { defaultRowHeight: 24 },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  masterSheet.columns = [
    { header: 'Proyecto', key: 'project', width: 28 },
    { header: 'Torre', key: 'tower', width: 14 },
    { header: 'Piso', key: 'floor', width: 14 },
    { header: 'Actividad', key: 'activity', width: 32 },
    { header: 'Cuadrilla', key: 'crew', width: 24 },
    { header: 'Planificado', key: 'planned', width: 14 },
    { header: 'Ejecutado', key: 'executed', width: 14 },
    { header: '% Avance', key: 'progress', width: 12 },
    { header: 'Estado', key: 'status', width: 18 },
    { header: 'Liberación', key: 'release', width: 18 },
    { header: 'Restricciones', key: 'restrictions', width: 36 },
    { header: 'Observaciones', key: 'observations', width: 38 },
  ];

  masterSheet.insertRow(1, ['Informe de Control de Obras DGC']);
  masterSheet.insertRow(2, ['']);
  styleTitleRows(masterSheet, `Fecha: ${format(new Date(), 'dd MMM yyyy', { locale: es })}`, 'L');
  insertLogo(masterSheet, logoImageId);
  styleHeader(masterSheet.getRow(3));

  masterItems.forEach((item) => {
    const planned = Number(item.planned_qty) || 0;
    const executed = Number(item.executed_qty) || 0;
    const pct = planned > 0 ? Number(((executed / planned) * 100).toFixed(1)) : 0;

    const row = masterSheet.addRow({
      project: item.project || '',
      tower: item.tower || '',
      floor: item.floor || '',
      activity: item.activity || '',
      crew: item.crew_name || '',
      planned,
      executed,
      progress: pct,
      status: item.status || 'Pendiente',
      release: item.release_status || '',
      restrictions: item.restrictions || '',
      observations: item.observations || '',
    });

    row.getCell('planned').numFmt = '#,##0';
    row.getCell('executed').numFmt = '#,##0';
    row.getCell('progress').numFmt = '0.0\\%';
    row.getCell('progress').alignment = { horizontal: 'right', vertical: 'middle' };

    const statusCell = row.getCell('status');
    const statusStyle = getStatusStyle(statusCell.value == null ? undefined : String(statusCell.value));
    statusCell.fill = /** @type {import('exceljs').Fill} */ (statusStyle.fill);
    statusCell.font = statusStyle.font;
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  masterSheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 12 } };
  styleSheetRows(masterSheet, 4);
  masterSheet.properties.tabColor = { argb: '142952' };

  const logSheet = workbook.addWorksheet('Reportes Diarios', {
    properties: { defaultRowHeight: 24 },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  logSheet.columns = [
    { header: 'Fecha', key: 'date', width: 16 },
    { header: 'Proyecto', key: 'project', width: 26 },
    { header: 'Torre', key: 'tower', width: 14 },
    { header: 'Piso', key: 'floor', width: 14 },
    { header: 'Actividad', key: 'activity', width: 32 },
    { header: 'Supervisor', key: 'supervisor', width: 24 },
    { header: 'Ejecutado Hoy', key: 'executed', width: 16 },
    { header: 'Horas', key: 'hours', width: 14 },
    { header: 'Restricción', key: 'hasRestriction', width: 16 },
    { header: 'Detalle Restricción', key: 'restrictionDetail', width: 38 },
    { header: 'Observaciones', key: 'observations', width: 38 },
  ];

  logSheet.insertRow(1, ['Informe de Reportes Diarios']);
  logSheet.insertRow(2, ['']);
  styleTitleRows(logSheet, `Fecha: ${format(new Date(), 'dd MMM yyyy', { locale: es })}`, 'K');
  insertLogo(logSheet, logoImageId);
  styleHeader(logSheet.getRow(3));

  dailyLogs.forEach((log) => {
    const masterItem = masterItems.find(mi => String(mi.id) === String(log.master_item_id));
    
    const project = log.project || masterItem?.project || '';
    const tower = log.tower || masterItem?.tower || '';
    const floor = log.floor || masterItem?.floor || '';
    const activity = log.activity || masterItem?.activity || '';

    const row = logSheet.addRow({
      date: log.date || '',
      project: project,
      tower: tower,
      floor: floor,
      activity: activity,
      supervisor: log.supervisor || '',
      executed: Number(log.executed_today) || 0,
      hours: Number(log.hours_worked) || 0,
      hasRestriction: log.has_restriction ? 'Sí' : 'No',
      restrictionDetail: log.restriction_detail || '',
      observations: log.observations || '',
    });

    row.font = { bold: true };
    row.getCell('executed').numFmt = '#,##0';
    row.getCell('hours').numFmt = '#,##0';
    row.getCell('date').numFmt = 'dd/mm/yyyy';

    if (log.has_restriction) {
      const restrictionCell = row.getCell('hasRestriction');
      restrictionCell.fill = /** @type {import('exceljs').FillPattern} */ ({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' },
      });
      restrictionCell.font = /** @type {Partial<import('exceljs').Font>} */ ({ color: { argb: 'FFB91C1C' }, bold: true });
    }

    let crewWorkers = [];
    if (Array.isArray(log.crew_workers)) {
      crewWorkers = log.crew_workers;
    } else if (typeof log.crew_workers === 'string') {
      try { crewWorkers = JSON.parse(log.crew_workers); } catch (e) {}
    }

    if (crewWorkers?.length) {
      crewWorkers.forEach((worker) => {
        const crewRow = logSheet.addRow({
          date: log.date || '',
          project: project,
          tower: tower,
          floor: floor,
          activity: `  └ ${worker.name || ''}`,
          supervisor: worker.role || '',
          executed: Number(worker.executed) || 0,
          hours: Number(worker.hours) || 0,
          hasRestriction: '',
          restrictionDetail: '',
          observations: '',
        });
        crewRow.font = { italic: true, color: { argb: 'FF475569' } };
      });
    }
  });

  logSheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: 11 } };
  styleSheetRows(logSheet, 4);
  logSheet.properties.tabColor = { argb: '2563EB' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `informe_obra_${format(new Date(), 'yyyy-MM-dd', { locale: es })}.xlsx`;
  saveAs(blob, filename);
}
