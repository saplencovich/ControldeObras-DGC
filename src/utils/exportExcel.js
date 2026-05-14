import ExcelJS from 'exceljs';
import FileSaver from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const LOGO_URL = 'https://media.base44.com/images/public/69c135c57c9886fec79cebc5/6324de60d_logoclientes-8.png';
const saveAs = FileSaver.saveAs || FileSaver;

const COLORS = {
  primary: 'FF142952',
  primarySoft: 'FFEAF0F8',
  accent: 'FFF59E0B',
  headerText: 'FFFFFFFF',
  text: 'FF0F172A',
  mutedText: 'FF64748B',
  border: 'FFCBD5E1',
  zebra: 'FFF8FAFC',
  worker: 'FFF1F5F9',
  warningBg: 'FFFEF3C7',
  warningText: 'FF92400E',
  infoBg: 'FFDBEAFE',
  infoText: 'FF1D4ED8',
  dangerBg: 'FFFEE2E2',
  dangerText: 'FFB91C1C',
  successBg: 'FFD1FAE5',
  successText: 'FF047857',
};

const thinBorder = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

const mediumTopBorder = {
  ...thinBorder,
  top: { style: 'medium', color: { argb: COLORS.primary } },
};

const statusLabels = {
  pendiente: 'Pendiente',
  en_ejecucion: 'En ejecución',
  no_liberado: 'No liberado',
  liberado: 'Liberado',
  bloqueado: 'Bloqueado',
  completado: 'Finalizado',
  finalizado: 'Finalizado',
};

const statusStyles = {
  Pendiente: { fill: COLORS.warningBg, font: COLORS.warningText },
  'En ejecución': { fill: COLORS.infoBg, font: COLORS.infoText },
  'No liberado': { fill: COLORS.warningBg, font: COLORS.warningText },
  Liberado: { fill: COLORS.successBg, font: COLORS.successText },
  Bloqueado: { fill: COLORS.dangerBg, font: COLORS.dangerText },
  Finalizado: { fill: COLORS.successBg, font: COLORS.successText },
};

function solidFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function normalizeStatus(value) {
  const key = String(value || 'pendiente').trim().toLowerCase();
  return statusLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeRelease(value) {
  if (!value) return '';
  return normalizeStatus(value);
}

function parseWorkers(rawWorkers) {
  if (Array.isArray(rawWorkers)) return rawWorkers;
  if (typeof rawWorkers === 'string' && rawWorkers.trim()) {
    try {
      const parsed = JSON.parse(rawWorkers);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function getMasterContext(masterItems, log) {
  const masterItem = masterItems.find((item) => String(item.id) === String(log.master_item_id));

  return {
    project: log.project || masterItem?.project || '',
    tower: log.tower || masterItem?.tower || '',
    floor: log.floor || masterItem?.floor || '',
    activity: log.activity || masterItem?.activity || '',
  };
}

function summarizeFloors(value) {
  const text = Array.isArray(value) ? value.join(', ') : String(value || '');
  const floors = text
    .split(/[,;/|]+/)
    .map((floor) => floor.trim())
    .filter(Boolean);

  if (floors.length <= 4) return text;

  const parsed = floors
    .map((floor) => {
      const match = floor.match(/^([A-Za-z]*)\s*0*(\d+)$/);
      return match ? { prefix: match[1] || 'P', number: Number(match[2]) } : null;
    })
    .filter(Boolean);

  const samePrefix = parsed.length === floors.length && parsed.every((floor) => floor.prefix === parsed[0].prefix);

  if (samePrefix) {
    const numbers = parsed.map((floor) => floor.number).sort((a, b) => a - b);
    return `${parsed[0].prefix}${numbers[0]}-${parsed[0].prefix}${numbers[numbers.length - 1]}`;
  }

  return floors.reduce((lines, floor, index) => {
    const lineIndex = Math.floor(index / 3);
    lines[lineIndex] = [...(lines[lineIndex] || []), floor];
    return lines;
  }, []).map((line) => line.join(', ')).join('\n');
}

function capRowHeight(row, maxHeight = 58) {
  const maxLines = Math.max(
    1,
    ...row.values.map((value) => String(value || '').split('\n').length)
  );
  row.height = Math.min(maxHeight, Math.max(22, maxLines * 15));
}

function styleHeader(row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = solidFill(COLORS.primary);
    cell.font = { color: { argb: COLORS.headerText }, bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });
  row.height = 30;
}

function styleTitle(sheet, title, subtitle, lastColumn, imageId) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.mergeCells(`A2:${lastColumn}2`);

  const titleRow = sheet.getRow(1);
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font = { size: 16, bold: true, color: { argb: COLORS.primary } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  titleRow.height = 26;

  const subtitleRow = sheet.getRow(2);
  subtitleRow.getCell(1).value = subtitle;
  subtitleRow.getCell(1).font = { size: 10, color: { argb: COLORS.mutedText } };
  subtitleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  subtitleRow.height = 22;

  if (imageId) {
    sheet.addImage(imageId, {
      tl: { col: Math.max(0, sheet.columnCount - 2.2), row: 0.15 },
      ext: { width: 120, height: 34 },
    });
  }
}

function styleDataRows(sheet, startRow, endRow, leftAlignedColumns = []) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const isEven = (rowNumber - startRow) % 2 === 1;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = thinBorder;
      cell.font = { color: { argb: COLORS.text }, size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: leftAlignedColumns.includes(colNumber) ? 'left' : 'center',
        wrapText: true,
      };

      if (isEven) {
        cell.fill = solidFill(COLORS.zebra);
      }
    });

    capRowHeight(row);
  }
}

function applyStatusStyle(cell) {
  const label = normalizeStatus(cell.value);
  const style = statusStyles[label] || statusStyles.Pendiente;

  cell.value = label;
  cell.fill = solidFill(style.fill);
  cell.font = { color: { argb: style.font }, bold: true, size: 10 };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function applyReleaseStyle(cell) {
  const label = normalizeRelease(cell.value);
  if (!label) return;

  const style = statusStyles[label] || statusStyles.Pendiente;
  cell.value = label;
  cell.fill = solidFill(style.fill);
  cell.font = { color: { argb: style.font }, bold: true, size: 10 };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function applyAutoFit(sheet, limits) {
  sheet.columns.forEach((column, index) => {
    const columnNumber = index + 1;
    const limit = limits[columnNumber] || { min: 10, max: 28 };
    let maxLength = limit.min;

    column.eachCell({ includeEmpty: true }, (cell) => {
      const text = String(cell.value?.richText ? cell.value.richText.map((part) => part.text).join('') : cell.value || '');
      const longestLine = Math.max(...text.split('\n').map((line) => line.length));
      maxLength = Math.max(maxLength, longestLine + 2);
    });

    column.width = Math.min(limit.max, Math.max(limit.min, maxLength));
  });
}

function addKpiBlock(sheet, kpis) {
  const row = sheet.getRow(4);
  row.height = 42;

  kpis.forEach((kpi, index) => {
    const startColumn = 1 + index * 2;
    const endColumn = startColumn + 1;
    sheet.mergeCells(4, startColumn, 4, endColumn);

    const cell = row.getCell(startColumn);
    cell.value = {
      richText: [
        { text: `${kpi.label}\n`, font: { size: 8, color: { argb: COLORS.mutedText } } },
        { text: String(kpi.value), font: { size: 14, bold: true, color: { argb: kpi.color || COLORS.primary } } },
      ],
    };
    cell.fill = solidFill(kpi.fill || 'FFFFFFFF');
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
}

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
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        resolve(workbook.addImage({ base64, extension: 'png' }));
      } catch (error) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = LOGO_URL;
  });
}

function addProgressBars(sheet, startRow, endRow, columnLetter) {
  if (endRow < startRow) return;

  sheet.addConditionalFormatting({
    ref: `${columnLetter}${startRow}:${columnLetter}${endRow}`,
    rules: [
      {
        type: 'dataBar',
        priority: 1,
        cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 100 }],
        color: { argb: COLORS.infoText },
        showValue: true,
      },
    ],
  });
}

function addExcelTable(sheet, name, headerRow, lastRow, lastColumn) {
  if (lastRow <= headerRow) return;

  sheet.addTable({
    name,
    ref: `A${headerRow}`,
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: false,
    },
    columns: sheet.getRow(headerRow).values.slice(1, lastColumn + 1).map((header) => ({
      name: String(header || ''),
      filterButton: true,
    })),
    rows: Array.from({ length: lastRow - headerRow }, (_, rowIndex) =>
      sheet.getRow(headerRow + 1 + rowIndex).values.slice(1, lastColumn + 1)
    ),
  });
}

function addMasterSheet(workbook, masterItems, logoImageId, exportedAt) {
  const sheet = workbook.addWorksheet('Plan Maestro', {
    properties: { defaultRowHeight: 24, outlineLevelRow: 1 },
    views: [{ state: 'frozen', ySplit: 6, xSplit: 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = [
    { key: 'project', width: 24 },
    { key: 'tower', width: 12 },
    { key: 'floor', width: 14 },
    { key: 'activity', width: 30 },
    { key: 'crew', width: 20 },
    { key: 'planned', width: 12 },
    { key: 'executed', width: 12 },
    { key: 'progress', width: 12 },
    { key: 'status', width: 16 },
    { key: 'release', width: 16 },
    { key: 'restrictions', width: 28 },
    { key: 'observations', width: 32 },
  ];

  const headerRowNumber = 6;
  const totalItems = masterItems.length;
  const pendingItems = masterItems.filter((item) => normalizeStatus(item.status) === 'Pendiente').length;
  const runningItems = masterItems.filter((item) => normalizeStatus(item.status) === 'En ejecución').length;
  const blockedItems = masterItems.filter((item) => normalizeStatus(item.status) === 'Bloqueado').length;
  const averageProgress = totalItems
    ? masterItems.reduce((sum, item) => {
      const planned = Number(item.planned_qty) || 0;
      const executed = Number(item.executed_qty) || 0;
      return sum + (planned > 0 ? (executed / planned) * 100 : 0);
    }, 0) / totalItems
    : 0;

  styleTitle(
    sheet,
    'Informe de Control de Obras DGC',
    `Exportado: ${exportedAt} | Plan maestro consolidado`,
    'L',
    logoImageId
  );
  addKpiBlock(sheet, [
    { label: 'Total actividades', value: totalItems, color: COLORS.primary },
    { label: 'Pendientes', value: pendingItems, color: COLORS.warningText, fill: COLORS.warningBg },
    { label: 'En ejecución', value: runningItems, color: COLORS.infoText, fill: COLORS.infoBg },
    { label: 'Avance promedio', value: `${averageProgress.toFixed(1)}%`, color: COLORS.successText, fill: COLORS.successBg },
    { label: 'Bloqueadas', value: blockedItems, color: COLORS.dangerText, fill: COLORS.dangerBg },
  ]);

  sheet.getRow(headerRowNumber).values = [
    'Proyecto',
    'Torre',
    'Piso',
    'Actividad',
    'Cuadrilla',
    'Planificado',
    'Ejecutado',
    '% Avance',
    'Estado',
    'Liberación',
    'Restricciones',
    'Observaciones',
  ];
  styleHeader(sheet.getRow(headerRowNumber));

  masterItems.forEach((item) => {
    const planned = Number(item.planned_qty) || 0;
    const executed = Number(item.executed_qty) || 0;
    const pct = planned > 0 ? Number(((executed / planned) * 100).toFixed(1)) : 0;
    const row = sheet.addRow({
      project: item.project || '',
      tower: item.tower || '',
      floor: summarizeFloors(item.floor),
      activity: item.activity || '',
      crew: item.crew_name || '',
      planned,
      executed,
      progress: pct,
      status: normalizeStatus(item.status),
      release: normalizeRelease(item.release_status),
      restrictions: item.restrictions || '',
      observations: item.observations || '',
    });

    row.getCell('planned').numFmt = '#,##0';
    row.getCell('executed').numFmt = '#,##0';
    row.getCell('progress').numFmt = '0.0';
    row.getCell('restrictions').alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    row.getCell('observations').alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    applyStatusStyle(row.getCell('status'));
    applyReleaseStyle(row.getCell('release'));
  });

  const lastRow = sheet.lastRow.number;
  styleDataRows(sheet, headerRowNumber + 1, lastRow, [1, 3, 4, 5, 11, 12]);

  for (let rowNumber = headerRowNumber + 1; rowNumber <= lastRow; rowNumber += 1) {
    applyStatusStyle(sheet.getRow(rowNumber).getCell('status'));
    applyReleaseStyle(sheet.getRow(rowNumber).getCell('release'));
  }

  sheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber, column: 12 } };
  addProgressBars(sheet, headerRowNumber + 1, lastRow, 'H');
  addExcelTable(sheet, 'TablaPlanMaestro', headerRowNumber, lastRow, 12);
  applyAutoFit(sheet, {
    1: { min: 16, max: 26 },
    2: { min: 10, max: 14 },
    3: { min: 10, max: 18 },
    4: { min: 20, max: 34 },
    5: { min: 16, max: 24 },
    6: { min: 11, max: 14 },
    7: { min: 11, max: 14 },
    8: { min: 11, max: 13 },
    9: { min: 13, max: 17 },
    10: { min: 13, max: 17 },
    11: { min: 18, max: 34 },
    12: { min: 20, max: 36 },
  });

  sheet.properties.tabColor = { argb: COLORS.primary };
}

function styleReportRow(row, hasError) {
  row.font = { bold: true, color: { argb: hasError ? COLORS.dangerText : COLORS.text }, size: 10 };
  row.height = 30;

  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = hasError ? { ...mediumTopBorder, bottom: { style: 'thin', color: { argb: COLORS.dangerText } } } : mediumTopBorder;
    cell.fill = solidFill(hasError ? COLORS.dangerBg : COLORS.primarySoft);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  row.getCell('activity').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  row.getCell('observations').alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
}

function styleWorkerRow(row) {
  row.outlineLevel = 1;
  row.font = { italic: true, color: { argb: COLORS.mutedText }, size: 10 };
  row.height = 23;

  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = thinBorder;
    cell.fill = solidFill(COLORS.worker);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  row.getCell('worker').alignment = { vertical: 'middle', horizontal: 'left', indent: 2, wrapText: true };
  row.getCell('role').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
}

function addDailyLogSheet(workbook, masterItems, dailyLogs, logoImageId, exportedAt) {
  const sheet = workbook.addWorksheet('Reportes Diarios', {
    properties: { defaultRowHeight: 24, outlineLevelRow: 1 },
    views: [{ state: 'frozen', ySplit: 6, xSplit: 2 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = [
    { key: 'date', width: 13 },
    { key: 'project', width: 22 },
    { key: 'tower', width: 11 },
    { key: 'floor', width: 11 },
    { key: 'activity', width: 30 },
    { key: 'supervisor', width: 20 },
    { key: 'crewTotal', width: 12 },
    { key: 'hours', width: 10 },
    { key: 'hasRestriction', width: 13 },
    { key: 'observations', width: 30 },
    { key: 'worker', width: 24 },
    { key: 'role', width: 18 },
    { key: 'workerExecuted', width: 13 },
    { key: 'workerHours', width: 12 },
    { key: 'validation', width: 20 },
  ];

  const headerRowNumber = 6;
  const logsWithRestriction = dailyLogs.filter((log) => log.has_restriction).length;
  const totalHours = dailyLogs.reduce((sum, log) => sum + (Number(log.hours_worked) || 0), 0);
  const totalCrewExecuted = dailyLogs.reduce((sum, log) => sum + (Number(log.executed_today) || 0), 0);

  styleTitle(
    sheet,
    'Informe de Reportes Diarios',
    `Exportado: ${exportedAt} | Reportes agrupados por jornada`,
    'O',
    logoImageId
  );
  addKpiBlock(sheet, [
    { label: 'Reportes', value: dailyLogs.length, color: COLORS.primary },
    { label: 'Ejec. cuadrilla', value: totalCrewExecuted.toLocaleString('es-CL'), color: COLORS.successText, fill: COLORS.successBg },
    { label: 'Horas', value: totalHours.toLocaleString('es-CL'), color: COLORS.infoText, fill: COLORS.infoBg },
    { label: 'Con restricción', value: logsWithRestriction, color: COLORS.dangerText, fill: COLORS.dangerBg },
  ]);

  sheet.getRow(headerRowNumber).values = [
    'Fecha',
    'Proyecto',
    'Torre',
    'Piso',
    'Actividad',
    'Supervisor',
    'Total cuadrilla',
    'Horas',
    'Restricción',
    'Observación',
    'Trabajador',
    'Cargo',
    'Ejec. Hoy',
    'Horas ind.',
    'Validacion',
  ];
  styleHeader(sheet.getRow(headerRowNumber));

  dailyLogs.forEach((log) => {
    const { project, tower, floor, activity } = getMasterContext(masterItems, log);
    const workers = parseWorkers(log.crew_workers);
    const crewTotal = Number(log.executed_today) || 0;
    const workerExecutedTotal = workers.reduce((sum, worker) => sum + (Number(worker.executed) || 0), 0);
    const hasWorkerDetail = workers.length > 0;
    const hasMismatch = hasWorkerDetail && Math.abs(workerExecutedTotal - crewTotal) > 0.001;
    const validationMessage = hasMismatch
      ? `Diferencia: cuadrilla ${crewTotal} vs trabajadores ${workerExecutedTotal}`
      : 'OK';

    const reportRow = sheet.addRow({
      date: log.date || '',
      project,
      tower,
      floor,
      activity,
      supervisor: log.supervisor || '',
      crewTotal,
      hours: Number(log.hours_worked) || 0,
      hasRestriction: log.has_restriction ? 'Sí' : 'No',
      observations: log.has_restriction
        ? [log.restriction_detail, log.observations].filter(Boolean).join('\n')
        : log.observations || '',
      worker: '',
      role: '',
      workerExecuted: workerExecutedTotal,
      workerHours: workers.reduce((sum, worker) => sum + (Number(worker.hours) || 0), 0),
      validation: hasWorkerDetail ? validationMessage : 'Sin detalle',
    });

    reportRow.getCell('date').numFmt = 'dd/mm/yyyy';
    reportRow.getCell('crewTotal').numFmt = '#,##0.##';
    reportRow.getCell('hours').numFmt = '#,##0.##';
    reportRow.getCell('workerExecuted').numFmt = '#,##0.##';
    reportRow.getCell('workerHours').numFmt = '#,##0.##';
    styleReportRow(reportRow, hasMismatch);

    if (log.has_restriction) {
      const restrictionCell = reportRow.getCell('hasRestriction');
      restrictionCell.fill = solidFill(COLORS.dangerBg);
      restrictionCell.font = { color: { argb: COLORS.dangerText }, bold: true };
    }

    if (hasMismatch) {
      const validationCell = reportRow.getCell('validation');
      validationCell.note = `La suma ejecutada por trabajadores (${workerExecutedTotal}) no coincide con el total de cuadrilla (${crewTotal}).`;
      validationCell.fill = solidFill(COLORS.dangerBg);
      validationCell.font = { color: { argb: COLORS.dangerText }, bold: true };
    }

    workers.forEach((worker) => {
      const workerRow = sheet.addRow({
        date: '',
        project: '',
        tower: '',
        floor: '',
        activity: '',
        supervisor: '',
        crewTotal: '',
        hours: '',
        hasRestriction: '',
        observations: '',
        worker: worker.name || '',
        role: worker.role || '',
        workerExecuted: Number(worker.executed) || 0,
        workerHours: Number(worker.hours) || 0,
        validation: '',
      });

      workerRow.getCell('workerExecuted').numFmt = '#,##0.##';
      workerRow.getCell('workerHours').numFmt = '#,##0.##';
      styleWorkerRow(workerRow);
    });
  });

  const lastRow = sheet.lastRow.number;
  sheet.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: headerRowNumber, column: 15 } };
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber, xSplit: 2 }];
  sheet.properties.outlineProperties = { summaryBelow: false, summaryRight: false };

  applyAutoFit(sheet, {
    1: { min: 11, max: 14 },
    2: { min: 16, max: 25 },
    3: { min: 9, max: 12 },
    4: { min: 9, max: 14 },
    5: { min: 20, max: 34 },
    6: { min: 16, max: 24 },
    7: { min: 11, max: 14 },
    8: { min: 9, max: 11 },
    9: { min: 12, max: 14 },
    10: { min: 20, max: 34 },
    11: { min: 18, max: 28 },
    12: { min: 14, max: 22 },
    13: { min: 11, max: 14 },
    14: { min: 10, max: 13 },
    15: { min: 14, max: 24 },
  });

  for (let rowNumber = headerRowNumber + 1; rowNumber <= lastRow; rowNumber += 1) {
    capRowHeight(sheet.getRow(rowNumber), 52);
  }

  sheet.properties.tabColor = { argb: COLORS.infoText };
}

export async function exportReportExcel(masterItems, dailyLogs) {
  const workbook = new ExcelJS.Workbook();
  const exportedAt = format(new Date(), 'dd MMM yyyy HH:mm', { locale: es });

  workbook.creator = 'Control de Obras DGC';
  workbook.company = 'DGC';
  workbook.subject = 'Informe de control de obras';
  workbook.created = new Date();
  workbook.modified = new Date();

  const logoImageId = await loadLogoImageId(workbook);

  addMasterSheet(workbook, masterItems, logoImageId, exportedAt);
  addDailyLogSheet(workbook, masterItems, dailyLogs, logoImageId, exportedAt);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `informe_obra_${format(new Date(), 'yyyy-MM-dd', { locale: es })}.xlsx`;
  saveAs(blob, filename);
}
