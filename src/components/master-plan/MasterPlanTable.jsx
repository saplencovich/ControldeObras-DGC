import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, FileText, Pencil, Trash2, ClipboardList, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const statusBadge = {
  pendiente: 'bg-slate-100 text-slate-600',
  en_ejecucion: 'bg-blue-50 text-blue-700',
  completado: 'bg-emerald-50 text-emerald-700',
  bloqueado: 'bg-red-50 text-red-700',
};

const statusLabel = {
  pendiente: 'Pendiente',
  en_ejecucion: 'En ejecución',
  completado: 'Completado',
  bloqueado: 'Bloqueado',
};

export default function MasterPlanTable({ items, dailyLogs = [], onEdit, onDelete, onDailyLog, onDeleteLog }) {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const getLogsForItem = (itemId) => dailyLogs.filter(l => l.master_item_id === itemId);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-accent" />
          Plan Maestro
          <Badge variant="secondary" className="ml-2 text-xs">{items.length} ítems</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs w-8"></TableHead>
                <TableHead className="text-xs">Proyecto</TableHead>
                <TableHead className="text-xs">Torre</TableHead>
                <TableHead className="text-xs">Piso</TableHead>
                <TableHead className="text-xs">Actividad</TableHead>
                <TableHead className="text-xs">F. Inicio</TableHead>
                <TableHead className="text-xs">F. Término</TableHead>
                <TableHead className="text-xs text-right">Plan</TableHead>
                <TableHead className="text-xs text-right">Ejecutado</TableHead>
                <TableHead className="text-xs">Und</TableHead>
                <TableHead className="text-xs">Cuadrilla</TableHead>
                <TableHead className="text-xs min-w-[100px]">% Avance</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs text-center">Prod.</TableHead>
                <TableHead className="text-xs">Restricciones</TableHead>
                <TableHead className="text-xs text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={16} className="text-center text-sm text-muted-foreground py-12">
                    No hay ítems en el plan maestro. Crea uno nuevo para comenzar.
                  </TableCell>
                </TableRow>
              )}
              {items.map(item => {
                const pct = item.planned_qty > 0 ? Math.round((item.executed_qty || 0) / item.planned_qty * 100) : 0;
                let prodColor = 'bg-red-500';
                if (pct >= 80) prodColor = 'bg-emerald-500';
                else if (pct >= 50) prodColor = 'bg-amber-400';

                const itemLogs = getLogsForItem(item.id);
                const isExpanded = expandedItems[item.id];

                return (
                   <React.Fragment key={item.id}>
                     {/* Master item row */}
                    <TableRow className="hover:bg-muted/30 text-xs">
                      <TableCell className="p-1">
                        {itemLogs.length > 0 && (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors"
                          >
                            {isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            }
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.project}</TableCell>
                      <TableCell>{item.tower || '—'}</TableCell>
                      <TableCell>{item.floor || '—'}</TableCell>
                      <TableCell className="font-medium">{item.activity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.start_date || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{item.end_date || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{item.planned_qty}</TableCell>
                      <TableCell className="text-right font-mono font-medium">{item.executed_qty || 0}</TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell>{item.crew_name || '—'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-medium">{pct}%</span>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${statusBadge[item.status] || statusBadge.pendiente}`}>
                          {statusLabel[item.status] || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto ${prodColor}`} />
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-muted-foreground" title={item.restrictions}>
                        {item.restrictions || '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/item/${item.id}`} className="flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5" /> Ver Detalle
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDailyLog(item)} className="gap-2">
                              <FileText className="w-3.5 h-3.5" /> Reporte Diario
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(item)} className="gap-2">
                              <Pencil className="w-3.5 h-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(item)} className="gap-2 text-destructive">
                              <Trash2 className="w-3.5 h-3.5" /> Borrar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {/* FILAS REPORTES DIARIOS EN CASCADA */}
                    {isExpanded && itemLogs.map(log => (
                      <TableRow key={log.id} className="bg-muted/20 text-xs border-l-2 border-l-accent/30">
                        <TableCell className="p-1"></TableCell>
                        <TableCell colSpan={4} className="pl-6 text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-accent" />
                            <span className="font-medium text-foreground">{log.date}</span>
                            <span>— {log.supervisor || 'Sin supervisor'}</span>
                          </span>
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">—</TableCell>
                        <TableCell className="text-right font-mono font-medium text-emerald-700">+{log.executed_today}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-muted-foreground text-[10px]">{log.crew_workers?.length ? `${log.crew_workers.length} pers.` : '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-[10px]">{log.hours_worked ? `${log.hours_worked}h` : '—'}</TableCell>
                        <TableCell>
                          {log.has_restriction && (
                            <Badge className="bg-red-50 text-red-700 text-[10px] gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Restricción
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="max-w-[120px] truncate text-muted-foreground text-[10px]" title={log.observations}>
                          {log.observations || '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => onDeleteLog(log, item)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}