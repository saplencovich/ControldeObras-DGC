import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  FileText,
  Pencil,
  Trash2,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";

const statusBadge = {
  pendiente: "bg-slate-100 text-slate-600",
  en_ejecucion: "bg-blue-50 text-blue-700",
  completado: "bg-emerald-50 text-emerald-700",
  bloqueado: "bg-red-50 text-red-700",
};

const statusLabel = {
  pendiente: "Pendiente",
  en_ejecucion: "En ejecución",
  completado: "Completado",
  bloqueado: "Bloqueado",
};

function getProgressPct(item) {
  const planned = Number(item?.planned_qty || 0);
  const executed = Number(item?.executed_qty || 0);

  if (planned <= 0) return 0;

  return Math.min(Math.round((executed / planned) * 100), 100);
}

function getProductivityColor(pct) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 75) return "bg-emerald-300";
  if (pct >= 50) return "bg-amber-400";
  if (pct >= 25) return "bg-orange-300";
  if (pct > 0) return "bg-red-300";
  return "bg-slate-200";
}

function formatNumber(value) {
  const number = Number(value || 0);

  if (Number.isInteger(number)) return number;

  return number.toFixed(2);
}

export default function MasterPlanTable({
  items = [],
  dailyLogs = [],
  onEdit,
  onDelete,
  onDailyLog,
  onDeleteLog,
}) {
  const [expandedItems, setExpandedItems] = useState({});

  const logsByItemId = useMemo(() => {
    return dailyLogs.reduce((acc, log) => {
      const key = Number(log.master_item_id);

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(log);

      return acc;
    }, {});
  }, [dailyLogs]);

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const safeOnEdit = (item) => {
    if (onEdit) onEdit(item);
  };

  const safeOnDelete = (item) => {
    if (onDelete) onDelete(item);
  };

  const safeOnDailyLog = (item) => {
    if (onDailyLog) onDailyLog(item);
  };

  const safeOnDeleteLog = (log, item) => {
    if (onDeleteLog) onDeleteLog(log, item);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ClipboardList className="h-4 w-4 text-accent" />
          Plan Maestro
          <Badge variant="secondary" className="ml-2 text-xs">
            {items.length} ítems
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 md:hidden">
          {items.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay ítems en el plan maestro. Crea uno nuevo para comenzar.
            </div>
          )}
          {items.map((item) => {
            const pct = item.planned_qty > 0 ? Math.round((item.executed_qty || 0) / item.planned_qty * 100) : 0;
            const itemLogs = logsByItemId[Number(item.id)] || [];
            return (
              <div key={item.id} className="rounded-lg border p-3 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.activity}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.project} — {item.tower || '—'} — {item.floor || '—'}
                    </p>
                  </div>
                  <Badge className={`text-[10px] ${statusBadge[item.status] || statusBadge.pendiente}`}>
                    {statusLabel[item.status] || item.status}
                  </Badge>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Inicio:</span> {item.start_date || '—'}</div>
                  <div><span className="text-muted-foreground">Término:</span> {item.end_date || '—'}</div>
                  <div><span className="text-muted-foreground">Plan:</span> {item.planned_qty} {item.unit}</div>
                  <div><span className="text-muted-foreground">Ejecutado:</span> {item.executed_qty || 0}</div>
                </div>
                <div className="mb-2 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">% Avance</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{item.crew_name || 'Sin cuadrilla'}</span>
                  <span>{itemLogs.length} reportes</span>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onDailyLog(item)}>
                    <FileText className="mr-1 h-3 w-3" /> Reporte
                  </Button>
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
                      <DropdownMenuItem onClick={() => onEdit(item)} className="gap-2">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(item)} className="gap-2 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" /> Borrar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8 text-xs" />
                <TableHead className="text-xs">Proyecto</TableHead>
                <TableHead className="text-xs">Torre</TableHead>
                <TableHead className="text-xs">Piso</TableHead>
                <TableHead className="text-xs">Actividad</TableHead>
                <TableHead className="text-xs">F. Inicio</TableHead>
                <TableHead className="text-xs">F. Término</TableHead>
                <TableHead className="text-right text-xs">Plan</TableHead>
                <TableHead className="text-right text-xs">Ejecutado</TableHead>
                <TableHead className="text-xs">Und</TableHead>
                <TableHead className="text-xs">Cuadrilla</TableHead>
                <TableHead className="min-w-[100px] text-xs">
                  % Avance
                </TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-center text-xs">Prod.</TableHead>
                <TableHead className="text-xs">Restricciones</TableHead>
                <TableHead className="text-center text-xs">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={16}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No hay ítems en el plan maestro. Crea uno nuevo para
                    comenzar.
                  </TableCell>
                </TableRow>
              )}

              {items.map((item) => {
                const itemId = Number(item.id);
                const pct = getProgressPct(item);
                const prodColor = getProductivityColor(pct);
                const itemLogs = logsByItemId[itemId] || [];
                const isExpanded = expandedItems[item.id];

                return (
                  <React.Fragment key={item.id}>
                    <TableRow className="text-xs hover:bg-muted/30">
                      <TableCell className="p-1">
                        {itemLogs.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-muted"
                            title={
                              isExpanded
                                ? "Ocultar reportes"
                                : "Ver reportes diarios"
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span className="block h-6 w-6" />
                        )}
                      </TableCell>

                      <TableCell className="font-medium">
                        {item.project || "—"}
                      </TableCell>

                      <TableCell>{item.tower || "—"}</TableCell>
                      <TableCell>{item.floor || "—"}</TableCell>

                      <TableCell className="font-medium">
                        {item.activity || "—"}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {item.start_date || "—"}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {item.end_date || "—"}
                      </TableCell>

                      <TableCell className="text-right font-mono">
                        {formatNumber(item.planned_qty)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-medium">
                        {formatNumber(item.executed_qty)}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {item.unit || "—"}
                      </TableCell>

                      <TableCell>{item.crew_name || "—"}</TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-medium">{pct}%</span>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            statusBadge[item.status] || statusBadge.pendiente
                          }`}
                        >
                          {statusLabel[item.status] ||
                            item.status ||
                            "Pendiente"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <div
                          className={`mx-auto h-3 w-3 rounded-full ${prodColor}`}
                          title={`Productividad ${pct}%`}
                        />
                      </TableCell>

                      <TableCell
                        className="max-w-[120px] truncate text-muted-foreground"
                        title={item.restrictions || ""}
                      >
                        {item.restrictions || "—"}
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/item/${item.id}`}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver Detalle
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => safeOnDailyLog(item)}
                              className="gap-2"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Reporte Diario
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => safeOnEdit(item)}
                              className="gap-2"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => safeOnDelete(item)}
                              className="gap-2 text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Borrar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {isExpanded &&
                      itemLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="border-l-2 border-l-accent/30 bg-muted/20 text-xs"
                        >
                          <TableCell className="p-1" />

                          <TableCell
                            colSpan={4}
                            className="pl-6 text-muted-foreground"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <FileText className="h-3 w-3 text-accent" />
                              <span className="font-medium text-foreground">
                                {log.date || "Sin fecha"}
                              </span>
                              <span>
                                — {log.supervisor || "Sin supervisor"}
                              </span>
                            </span>
                          </TableCell>

                          <TableCell />
                          <TableCell />

                          <TableCell className="text-right font-mono text-muted-foreground">
                            —
                          </TableCell>

                          <TableCell className="text-right font-mono font-medium text-emerald-700">
                            +{formatNumber(log.executed_today)}
                          </TableCell>

                          <TableCell />

                          <TableCell className="text-[10px] text-muted-foreground">
                            {Array.isArray(log.crew_workers) &&
                            log.crew_workers.length
                              ? `${log.crew_workers.length} pers.`
                              : "—"}
                          </TableCell>

                          <TableCell className="text-[10px] text-muted-foreground">
                            {log.hours_worked
                              ? `${formatNumber(log.hours_worked)}h`
                              : "—"}
                          </TableCell>

                          <TableCell>
                            {log.has_restriction && (
                              <Badge className="gap-1 bg-red-50 text-[10px] text-red-700">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Restricción
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell />

                          <TableCell
                            className="max-w-[120px] truncate text-[10px] text-muted-foreground"
                            title={log.observations || ""}
                          >
                            {log.observations || "—"}
                          </TableCell>

                          <TableCell />
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