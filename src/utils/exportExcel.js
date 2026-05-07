import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function exportReportExcel(masterItems, dailyLogs) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Control de Obras DGC';
  workbook.created = new Date();

  // 1. Plan Maestro Sheet
  const masterSheet = workbook.addWorksheet('Plan Maestro');
  
  masterSheet.columns = [
    { header: 'Proyecto', key: 'project', width: 25 },
    { header: 'Torre', key: 'tower', width: 15 },
    { header: 'Piso', key: 'floor', width: 15 },
    { header: 'Actividad', key: 'activity', width: 30 },
    { header: 'Cuadrilla', key: 'crew', width: 25 },
    { header: 'Planificado', key: 'planned', width: 15 },
    { header: 'Ejecutado', key: 'executed', width: 15 },
    { header: '% Avance', key: 'progress', width: 15 },
    { header: 'Estado', key: 'status', width: 20 },
    { header: 'Liberación', key: 'release', width: 20 },
    { header: 'Restricciones', key: 'restrictions', width: 40 },
    { header: 'Observaciones', key: 'observations', width: 40 },
  ];

  // Estilo de Cabeceras
  masterSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' } // Slate-900 (Color Oscuro Web)
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Datos
  masterItems.forEach(item => {
    const planned = Number(item.planned_qty) || 0;
    const executed = Number(item.executed_qty) || 0;
    const pct = planned > 0 ? (executed / planned * 100).toFixed(1) : 0;
    
    const row = masterSheet.addRow({
      project: item.project || '',
      tower: item.tower || '',
      floor: item.floor || '',
      activity: item.activity || '',
      crew: item.crew_name || '',
      planned: planned,
      executed: executed,
      progress: Number(pct),
      status: item.status || 'pendiente',
      release: item.release_status || '',
      restrictions: item.restrictions || '',
      observations: item.observations || ''
    });

    // Añadir estilo al % de Avance
    const progressCell = row.getCell('progress');
    progressCell.numFmt = '0.0"%"';

    // Añadir colores a Estado
    const statusCell = row.getCell('status');
    const statusVal = statusCell.value?.toLowerCase();
    
    if (statusVal === 'completado') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Emerald-50
      statusCell.font = { color: { argb: 'FF047857' }, bold: true }; // Emerald-700
    } else if (statusVal === 'en_ejecucion') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Blue-50
      statusCell.font = { color: { argb: 'FF1D4ED8' }, bold: true }; // Blue-700
    } else if (statusVal === 'bloqueado') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Red-50
      statusCell.font = { color: { argb: 'FFB91C1C' }, bold: true }; // Red-700
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Slate-100
      statusCell.font = { color: { argb: 'FF475569' }, bold: true }; // Slate-600
    }
  });

  // 2. Reportes Diarios Sheet
  const logSheet = workbook.addWorksheet('Reportes Diarios');
  
  logSheet.columns = [
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Proyecto', key: 'project', width: 25 },
    { header: 'Torre', key: 'tower', width: 15 },
    { header: 'Piso', key: 'floor', width: 15 },
    { header: 'Actividad', key: 'activity', width: 30 },
    { header: 'Supervisor', key: 'supervisor', width: 25 },
    { header: 'Ejecutado Hoy', key: 'executed', width: 15 },
    { header: 'Horas', key: 'hours', width: 15 },
    { header: 'Restricción', key: 'hasRestriction', width: 15 },
    { header: 'Detalle Restricción', key: 'restrictionDetail', width: 40 },
    { header: 'Observaciones', key: 'observations', width: 40 },
  ];

  // Estilo de Cabeceras Reportes
  logSheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' } // Slate-700
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  dailyLogs.forEach(log => {
    const mainRow = logSheet.addRow({
      date: log.date || '',
      project: log.project || '',
      tower: log.tower || '',
      floor: log.floor || '',
      activity: log.activity || '',
      supervisor: log.supervisor || '',
      executed: Number(log.executed_today) || 0,
      hours: Number(log.hours_worked) || 0,
      hasRestriction: log.has_restriction ? 'Sí' : 'No',
      restrictionDetail: log.restriction_detail || '',
      observations: log.observations || ''
    });
    
    // Marcar Restricciones en rojo
    if (log.has_restriction) {
       mainRow.getCell('hasRestriction').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
       mainRow.getCell('hasRestriction').font = { color: { argb: 'FFB91C1C' }, bold: true };
    }

    // Agregar desglose de personal si existe
    if (log.crew_workers?.length) {
      log.crew_workers.forEach(w => {
        const workerRow = logSheet.addRow({
          date: '',
          project: '',
          tower: '',
          floor: '',
          activity: `  └ ${w.name || ''}`,
          supervisor: w.role || '',
          executed: Number(w.executed) || 0,
          hours: Number(w.hours) || 0,
          hasRestriction: '',
          restrictionDetail: '',
          observations: ''
        });
        workerRow.font = { italic: true, color: { argb: 'FF64748B' } }; // Slate-500
      });
    }
  });

  // Guardar archivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `informe_obra_${format(new Date(), 'yyyy-MM-dd', { locale: es })}.xlsx`;
  saveAs(blob, filename);
}
