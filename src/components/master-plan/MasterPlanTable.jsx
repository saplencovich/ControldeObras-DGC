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
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getFloorList } from "@/utils/floors";

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

function FloorsDisplay({ floor, compact = false }) {
  const floors = getFloorList(floor);

  if (floors.length === 0) return "—";

  const visibleCount = compact ? 2 : 4;
  const visibleFloors = floors.slice(0, visibleCount);
  const remainingCount = floors.length - visibleFloors.length;

  return (
    <div
      className="flex max-w-[220px] flex-wrap items-center gap-1"
      title={floors.join(", ")}
    >
      {visibleFloors.map((item) => (
        <span
          key={item}
          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground/80"
        >
          {item}
        </span>
      ))}

      {remainingCount > 0 && (
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

function buildRowsForFloors(items) {
  return items.flatMap((item) => {
    const floors = getFloorList(item.floor);

    if (floors.length === 0) {
      return [{
        ...item,
        displayFloor: "",
        displayRowId: `${item.id}-default`,
        isPrimaryFloorRow: true,
      }];
    }

    return floors.map((floor, index) => ({
      ...item,
      displayFloor: floor,
      displayRowId: `${item.id}-${index}`,
      isPrimaryFloorRow: index === 0,
    }));
  });
}

function normalizeFloor(value) {
  return String(value || "").trim();
}

function logBelongsToFloor(log, row) {
  const logFloor = normalizeFloor(log.floor);
  const rowFloor = normalizeFloor(row.displayFloor);

  if (!rowFloor) return !logFloor;
  if (logFloor === rowFloor) return true;

  return row.isPrimaryFloorRow && logFloor === normalizeFloor(row.floor);
}

export default function MasterPlanTable({
  items = [],
  projects = [],
  dailyLogs = [],
  onEdit,
  onDelete,
  onDailyLog,
  onDeleteLog,
}) {
  const [expandedItems, setExpandedItems] = useState({});
  const displayRows = useMemo(() => buildRowsForFloors(items), [items]);

  const projectSupervisorByName = useMemo(() => {
    return projects.reduce((acc, project) => {
      if (project.name) acc[project.name] = project.supervisor || "";
      return acc;
    }, {});
  }, [projects]);

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
    if (!onDailyLog) return;

    onDailyLog({
      ...item,
      floor: item.displayFloor || item.floor,
      originalFloorScope: item.floor,
    });
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
          {displayRows.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay ítems en el plan maestro. Crea uno nuevo para comenzar.
            </div>
          )}
          {displayRows.map((row) => {
            const pct = row.planned_qty > 0 ? Math.round((row.executed_qty || 0) / row.planned_qty * 100) : 0;
            const itemLogs = (logsByItemId[Number(row.id)] || []).filter((log) =>
              logBelongsToFloor(log, row)
            );
            return (
              <div key={row.displayRowId} className="rounded-lg border p-3 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{row.activity}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.project} — {row.tower || '—'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <UserRound className="h-3 w-3" />
                      {projectSupervisorByName[row.project] || "Sin supervisor"}
                    </p>
                    <div className="mt-1">
                      <FloorsDisplay floor={row.displayFloor} compact />
                    </div>
                  </div>
                  <Badge className={`text-[10px] ${statusBadge[row.status] || statusBadge.pendiente}`}>
                    {statusLabel[row.status] || row.status}
                  </Badge>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground">Inicio:</span> {row.start_date || '—'}</div>
                  <div><span className="text-muted-foreground">Término:</span> {row.end_date || '—'}</div>
                  <div><span className="text-muted-foreground">Plan:</span> {row.planned_qty} {row.unit}</div>
                  <div><span className="text-muted-foreground">Ejecutado:</span> {row.executed_qty || 0}</div>
                </div>
                <div className="mb-2 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">% Avance</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{row.crew_name || 'Sin cuadrilla'}</span>
                  <span>{itemLogs.length} reportes</span>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => safeOnDailyLog(row)}>
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
                        <Link to={`/item/${row.id}`} className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5" /> Ver Detalle
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(row)} className="gap-2">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(row)} className="gap-2 text-destructive">
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
                <TableHead className="text-xs">Supervisor</TableHead>
                <TableHead className="text-xs">Torre</TableHead>
                <TableHead className="text-xs">Piso</TableHead>
                <TableHead className="text-xs">Actividad</TableHead>
                <TableHead className="min-w-[92px] whitespace-nowrap text-xs">F. Inicio</TableHead>
                <TableHead className="min-w-[92px] whitespace-nowrap text-xs">F. Término</TableHead>
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
              {displayRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={17}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No hay ítems en el plan maestro. Crea uno nuevo para
                    comenzar.
                  </TableCell>
                </TableRow>
              )}

              {displayRows.map((row) => {
                const itemId = Number(row.id);
                const pct = getProgressPct(row);
                const prodColor = getProductivityColor(pct);
                const itemLogs = (logsByItemId[itemId] || []).filter((log) =>
                  logBelongsToFloor(log, row)
                );
                const isExpanded = expandedItems[row.displayRowId];

                return (
                  <React.Fragment key={row.displayRowId}>
                    <TableRow className="text-xs hover:bg-muted/30">
                      <TableCell className="p-1">
                        {itemLogs.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.displayRowId)}
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
                        {row.project || "—"}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {projectSupervisorByName[row.project] || "—"}
                      </TableCell>

                      <TableCell>{row.tower || "—"}</TableCell>
                      <TableCell className="min-w-[160px] max-w-[240px]">
                        <FloorsDisplay floor={row.displayFloor} />
                      </TableCell>

                      <TableCell className="font-medium">
                        {row.activity || "—"}
                      </TableCell>

                      <TableCell className="min-w-[92px] whitespace-nowrap font-mono text-muted-foreground">
                        {row.start_date || "—"}
                      </TableCell>

                      <TableCell className="min-w-[92px] whitespace-nowrap font-mono text-muted-foreground">
                        {row.end_date || "—"}
                      </TableCell>

                      <TableCell className="text-right font-mono">
                        {formatNumber(row.planned_qty)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-medium">
                        {formatNumber(row.executed_qty)}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {row.unit || "—"}
                      </TableCell>

                      <TableCell>{row.crew_name || "—"}</TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <span className="font-medium">{pct}%</span>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            statusBadge[row.status] || statusBadge.pendiente
                          }`}
                        >
                          {statusLabel[row.status] ||
                            row.status ||
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
                        title={row.restrictions || ""}
                      >
                        {row.restrictions || "—"}
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
                                to={`/item/${row.id}`}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Ver Detalle
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => safeOnDailyLog(row)}
                              className="gap-2"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Reporte Diario
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => safeOnEdit(row)}
                              className="gap-2"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => safeOnDelete(row)}
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
                          key={`${row.displayRowId}-${log.id}`}
                          className="border-l-2 border-l-accent/30 bg-muted/20 text-xs"
                        >
                          <TableCell className="p-1" />

                          <TableCell
                            colSpan={5}
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
