import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

function sortFloorsDesc(floors) {
  return [...floors].sort((a, b) => {
    const numA = parseInt(String(a.floor), 10) || 0;
    const numB = parseInt(String(b.floor), 10) || 0;
    if (numB !== numA) return numB - numA;
    return String(a.floor).localeCompare(String(b.floor), 'es');
  });
}

function getFloorStatusStyle(pct) {
  if (pct >= 100) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-white',
      label: '✓',
      dot: 'bg-emerald-500',
      indicatorClassName: 'bg-emerald-600',
      trackClassName: 'bg-emerald-600/20',
    };
  }

  if (pct >= 75) {
    return {
      bg: 'bg-emerald-300',
      text: 'text-emerald-900',
      label: `${pct}%`,
      dot: 'bg-emerald-300',
      indicatorClassName: 'bg-emerald-500',
      trackClassName: 'bg-emerald-500/20',
    };
  }

  if (pct >= 50) {
    return {
      bg: 'bg-amber-400',
      text: 'text-amber-900',
      label: `${pct}%`,
      dot: 'bg-amber-400',
      indicatorClassName: 'bg-amber-500',
      trackClassName: 'bg-amber-500/25',
    };
  }

  if (pct >= 25) {
    return {
      bg: 'bg-orange-300',
      text: 'text-orange-900',
      label: `${pct}%`,
      dot: 'bg-orange-300',
      indicatorClassName: 'bg-orange-500',
      trackClassName: 'bg-orange-500/20',
    };
  }

  if (pct > 0) {
    return {
      bg: 'bg-red-300',
      text: 'text-red-900',
      label: `${pct}%`,
      dot: 'bg-red-300',
      indicatorClassName: 'bg-red-500',
      trackClassName: 'bg-red-500/20',
    };
  }

  return {
    bg: 'bg-slate-100',
    text: 'text-slate-400',
    label: `${pct}%`,
    dot: 'bg-slate-200',
    indicatorClassName: 'bg-slate-400',
    trackClassName: 'bg-slate-300/80',
  };
}

function BuildingVisual({ floors }) {
  if (!floors.length) return null;

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <div className="w-1 h-4 bg-slate-400 rounded-full mx-auto mb-0.5" />

      <div
        className="bg-slate-700 rounded-t-md flex items-center justify-center"
        style={{ width: 72, height: 14 }}
      >
        <span className="text-white text-[9px] font-bold tracking-wide">
          EDIFICIO
        </span>
      </div>

      {floors.map((f) => {
        const { bg, text, label } = getFloorStatusStyle(f.pct);

        return (
          <div
            key={f.floor}
            className={`${bg} ${text} flex items-center justify-between px-2 border border-white/60 transition-all`}
            style={{ width: 72, height: 22 }}
            title={`${f.floor}: ${f.pct}%`}
          >
            <span className="text-[9px] font-semibold truncate max-w-[32px]">
              {f.floor}
            </span>

            <span className="text-[9px] font-bold">
              {label}
            </span>
          </div>
        );
      })}

      <div
        className="bg-slate-800 rounded-b-sm"
        style={{ width: 80, height: 8 }}
      />

      <div
        className="bg-slate-600 rounded-b-sm"
        style={{ width: 88, height: 5 }}
      />

      <div className="flex flex-col gap-1 mt-3 p-2 bg-muted/30 rounded-md border border-border/50">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" /><span className="text-[9px] text-foreground/80">100%</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-300 rounded-sm" /><span className="text-[9px] text-foreground/80">&ge;75%</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-400 rounded-sm" /><span className="text-[9px] text-foreground/80">&ge;50%</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-300 rounded-sm" /><span className="text-[9px] text-foreground/80">&ge;25%</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-300 rounded-sm" /><span className="text-[9px] text-foreground/80">&gt;0%</span></div>
      </div>
    </div>
  );
}

const stickyPiso =
  'md:sticky md:left-0 md:z-20 md:w-28 md:min-w-[7rem] md:bg-background/95 md:backdrop-blur-sm md:border-r md:border-border/60 md:shadow-[4px_0_12px_-8px_rgba(0,0,0,0.15)]';

const stickyInicio =
  'md:sticky md:left-28 md:z-20 md:w-36 md:min-w-[9rem] md:bg-background/95 md:backdrop-blur-sm md:border-r md:border-border/60 md:shadow-[4px_0_12px_-8px_rgba(0,0,0,0.12)]';

const stickyHeadPiso =
  'md:sticky md:left-0 md:z-30 md:w-28 md:min-w-[7rem] md:bg-muted/95 md:backdrop-blur-sm md:border-r md:border-border/60 md:shadow-[4px_0_12px_-8px_rgba(0,0,0,0.15)]';

const stickyHeadInicio =
  'md:sticky md:left-28 md:z-30 md:w-36 md:min-w-[9rem] md:bg-muted/95 md:backdrop-blur-sm md:border-r md:border-border/60 md:shadow-[4px_0_12px_-8px_rgba(0,0,0,0.12)]';

export default function FloorProgress({ masterItems }) {
  const towers = [...new Set(masterItems.map((i) => i.tower).filter(Boolean))];

  const [selectedTower, setSelectedTower] = useState('__all__');

  const filtered =
    selectedTower === '__all__'
      ? masterItems
      : masterItems.filter((i) => i.tower === selectedTower);

  const floorMap = {};

  filtered.forEach((item) => {
    const floor = item.floor || 'Sin piso';

    if (!floorMap[floor]) {
      floorMap[floor] = {
        floor,
        startDate: item.start_date,
        activities: {},
        totalPlanned: 0,
        totalExecuted: 0,
      };
    }

    if (!floorMap[floor].startDate && item.start_date) {
      floorMap[floor].startDate = item.start_date;
    }

    if (
      item.start_date &&
      floorMap[floor].startDate &&
      item.start_date < floorMap[floor].startDate
    ) {
      floorMap[floor].startDate = item.start_date;
    }

    const act = item.activity || 'General';

    if (!floorMap[floor].activities[act]) {
      floorMap[floor].activities[act] = {
        planned: 0,
        executed: 0,
      };
    }

    floorMap[floor].activities[act].planned += item.planned_qty || 0;
    floorMap[floor].activities[act].executed += item.executed_qty || 0;

    floorMap[floor].totalPlanned += item.planned_qty || 0;
    floorMap[floor].totalExecuted += item.executed_qty || 0;
  });

  const floors = Object.values(floorMap).map((f) => ({
    ...f,
    pct:
      f.totalPlanned > 0
        ? Math.round((f.totalExecuted / f.totalPlanned) * 100)
        : 0,
  }));

  const floorsSorted = sortFloorsDesc(floors);

  const allActivities = [
    ...new Set(filtered.map((i) => i.activity || 'General')),
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            Avance por Piso
          </CardTitle>

          {towers.length > 0 && (
            <Select
              value={selectedTower}
              onValueChange={setSelectedTower}
            >
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Torre" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="__all__">
                  Todas las torres
                </SelectItem>

                {towers.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex gap-6 items-start">
          <div className="hidden sm:flex flex-shrink-0 pt-2 sm:sticky sm:top-4 sm:self-start">
            <BuildingVisual floors={floorsSorted} />
          </div>

          <div className="overflow-x-auto flex-1 min-w-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2 border-border hover:bg-muted/50">
                  <TableHead
                    className={cn(
                      'text-xs font-semibold text-foreground/90 align-middle',
                      stickyHeadPiso
                    )}
                  >
                    Piso
                  </TableHead>

                  <TableHead
                    className={cn(
                      'text-xs font-semibold text-foreground/90 align-middle',
                      stickyHeadInicio
                    )}
                  >
                    F. Inicio
                  </TableHead>

                  <TableHead className="text-xs font-semibold text-foreground/90 text-center">
                    Global
                  </TableHead>

                  {allActivities.map((act) => (
                    <TableHead
                      key={act}
                      className="text-xs font-semibold text-foreground/90 text-center"
                    >
                      {act}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {floorsSorted.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3 + allActivities.length}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      Sin datos de pisos
                    </TableCell>
                  </TableRow>
                )}

                {floorsSorted.map((f) => {
                  const status = getFloorStatusStyle(f.pct);

                  return (
                    <TableRow
                      key={f.floor}
                      className="group hover:bg-muted/30 border-b"
                    >
                      <TableCell
                        className={cn(
                          'text-sm font-medium md:group-hover:bg-muted/40',
                          stickyPiso
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2 w-2 shrink-0 rounded-full ring-1 ring-border/40',
                              status.dot
                            )}
                            aria-hidden
                          />

                          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">
                            {f.floor}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(
                          'text-xs text-muted-foreground md:group-hover:bg-muted/40',
                          stickyInicio
                        )}
                      >
                        {f.startDate || '—'}
                      </TableCell>

                      <TableCell className="min-w-[100px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs gap-2">
                            <span className="text-muted-foreground tabular-nums">
                              {f.totalExecuted}/{f.totalPlanned}
                            </span>

                            <span className="font-bold tabular-nums">
                              {f.pct}%
                            </span>
                          </div>

                          <Progress
                            value={f.pct}
                            className="h-1.5"
                            indicatorClassName={status.indicatorClassName}
                            trackClassName={status.trackClassName}
                          />
                        </div>
                      </TableCell>

                      {allActivities.map((act) => {
                        const data = f.activities[act];

                        const pct =
                          data && data.planned > 0
                            ? Math.round(
                              (data.executed / data.planned) * 100
                            )
                            : 0;

                        const actStyle = getFloorStatusStyle(pct);

                        return (
                          <TableCell
                            key={act}
                            className="min-w-[120px]"
                          >
                            {data ? (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs gap-2">
                                  <span className="text-muted-foreground tabular-nums">
                                    {data.executed}/{data.planned}
                                  </span>

                                  <span className="font-medium tabular-nums">
                                    {pct}%
                                  </span>
                                </div>

                                <Progress
                                  value={pct}
                                  className="h-1.5"
                                  indicatorClassName={actStyle.indicatorClassName}
                                  trackClassName={actStyle.trackClassName}
                                />
                              </div>
                            ) : (
                              <div className="flex min-h-[36px] items-center justify-center text-xs text-muted-foreground/40">
                                —
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}