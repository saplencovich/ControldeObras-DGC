import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function BuildingVisual({ floors }) {
  if (!floors.length) return null;

  const sorted = [...floors].sort((a, b) => {
    const numA = parseInt(a.floor) || 0;
    const numB = parseInt(b.floor) || 0;
    return numB - numA;
  });

  const getColor = (pct) => {
    if (pct >= 100) return { bg: 'bg-emerald-500', text: 'text-white', label: '✓' };
    if (pct >= 75)  return { bg: 'bg-emerald-300', text: 'text-emerald-900', label: `${pct}%` };
    if (pct >= 50)  return { bg: 'bg-amber-400',   text: 'text-amber-900',   label: `${pct}%` };
    if (pct >= 25)  return { bg: 'bg-orange-300',  text: 'text-orange-900',  label: `${pct}%` };
    if (pct > 0)    return { bg: 'bg-red-300',     text: 'text-red-900',     label: `${pct}%` };
    return            { bg: 'bg-slate-100',       text: 'text-slate-400',   label: `${pct}%` };
  };

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      {/* Antena */}
      <div className="w-1 h-4 bg-slate-400 rounded-full mx-auto mb-0.5" />
      {/* Techo */}
      <div
        className="bg-slate-700 rounded-t-md flex items-center justify-center"
        style={{ width: 72, height: 14 }}
      >
        <span className="text-white text-[9px] font-bold tracking-wide">EDIFICIO</span>
      </div>
      {/* Pisos */}
      {sorted.map((f, i) => {
        const { bg, text, label } = getColor(f.pct);
        return (
          <div
            key={f.floor}
            className={`${bg} ${text} flex items-center justify-between px-2 border border-white/60 transition-all`}
            style={{ width: 72, height: 22 }}
            title={`${f.floor}: ${f.pct}%`}
          >
            <span className="text-[9px] font-semibold truncate max-w-[32px]">{f.floor}</span>
            <span className="text-[9px] font-bold">{label}</span>
          </div>
        );
      })}
      {/* Base */}
      <div className="bg-slate-800 rounded-b-sm" style={{ width: 80, height: 8 }} />
      {/* Cimientos */}
      <div className="bg-slate-600 rounded-b-sm" style={{ width: 88, height: 5 }} />
      {/* Leyenda */}
      <div className="mt-3 flex flex-col gap-1 text-[8px] text-muted-foreground">
        {[
          { bg: 'bg-emerald-500', label: '100%' },
          { bg: 'bg-emerald-300', label: '≥75%' },
          { bg: 'bg-amber-400',   label: '≥50%' },
          { bg: 'bg-orange-300',  label: '≥25%' },
          { bg: 'bg-red-300',     label: '<25%' },
          { bg: 'bg-slate-100 border border-slate-200', label: '0%' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${item.bg}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FloorProgress({ masterItems }) {
  const towers = [...new Set(masterItems.map(i => i.tower).filter(Boolean))];
  const [selectedTower, setSelectedTower] = useState('__all__');

  const filtered = selectedTower === '__all__'
    ? masterItems
    : masterItems.filter(i => i.tower === selectedTower);

  const floorMap = {};
  filtered.forEach(item => {
    const floor = item.floor || 'Sin piso';
    if (!floorMap[floor]) {
      floorMap[floor] = { floor, startDate: item.start_date, activities: {}, totalPlanned: 0, totalExecuted: 0 };
    }
    if (!floorMap[floor].startDate && item.start_date) floorMap[floor].startDate = item.start_date;
    if (item.start_date && floorMap[floor].startDate && item.start_date < floorMap[floor].startDate) {
      floorMap[floor].startDate = item.start_date;
    }

    const act = item.activity || 'General';
    if (!floorMap[floor].activities[act]) floorMap[floor].activities[act] = { planned: 0, executed: 0 };
    floorMap[floor].activities[act].planned += item.planned_qty || 0;
    floorMap[floor].activities[act].executed += item.executed_qty || 0;
    floorMap[floor].totalPlanned += item.planned_qty || 0;
    floorMap[floor].totalExecuted += item.executed_qty || 0;
  });

  const floors = Object.values(floorMap).map(f => ({
    ...f,
    pct: f.totalPlanned > 0 ? Math.round((f.totalExecuted / f.totalPlanned) * 100) : 0,
  }));

  const allActivities = [...new Set(filtered.map(i => i.activity || 'General'))];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            Avance por Piso
          </CardTitle>
          {towers.length > 0 && (
            <Select value={selectedTower} onValueChange={setSelectedTower}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Torre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las torres</SelectItem>
                {towers.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 items-start">
          {/* Edificio visual */}
          <div className="hidden sm:flex flex-shrink-0 pt-2">
            <BuildingVisual floors={floors} />
          </div>
          {/* Tabla */}
          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs">Piso</TableHead>
                  <TableHead className="text-xs">F. Inicio</TableHead>
                  <TableHead className="text-xs text-center">Global</TableHead>
                  {allActivities.map(act => (
                    <TableHead key={act} className="text-xs text-center">{act}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {floors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3 + allActivities.length} className="text-center text-sm text-muted-foreground py-8">
                      Sin datos de pisos
                    </TableCell>
                  </TableRow>
                )}
                {floors.map(f => (
                  <TableRow key={f.floor} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium">{f.floor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.startDate || '—'}</TableCell>
                    <TableCell className="min-w-[100px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{f.totalExecuted}/{f.totalPlanned}</span>
                          <span className="font-bold">{f.pct}%</span>
                        </div>
                        <Progress value={f.pct} className="h-1.5" />
                      </div>
                    </TableCell>
                    {allActivities.map(act => {
                      const data = f.activities[act];
                      const pct = data && data.planned > 0 ? Math.round((data.executed / data.planned) * 100) : 0;
                      return (
                        <TableCell key={act} className="min-w-[120px]">
                          {data ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{data.executed}/{data.planned}</span>
                                <span className="font-medium">{pct}%</span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}