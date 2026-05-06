import React, { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function parseLocalDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

export default function EventCalendar({ masterItems = [], dailyLogs = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tooltip, setTooltip] = useState(null); // { rect, event } o { rect, allEvents }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const masterItemIds = useMemo(
    () => new Set(masterItems.map((item) => item.id)),
    [masterItems]
  );

  const getEventsForDay = (day) => {
    const events = [];

    masterItems.forEach((item) => {
      if (item.start_date && isSameDay(parseLocalDate(item.start_date), day)) {
        events.push({
          type: 'start',
          label: item.activity,
          color: 'bg-blue-500',
          detail: {
            title: item.activity,
            project: item.project,
            tower: item.tower,
            floor: item.floor,
            crew: item.crew_name,
            end: item.end_date,
            planned: item.planned_qty,
            unit: item.unit,
          },
        });
      }
    });

    dailyLogs
      .filter((log) => !log.master_item_id || masterItemIds.has(log.master_item_id))
      .forEach((log) => {
        if (log.date && isSameDay(parseLocalDate(log.date), day)) {
          events.push({
            type: 'log',
            label: log.activity || 'Reporte',
            color: 'bg-emerald-500',
            detail: {
              title: log.activity || 'Reporte Diario',
              project: log.project,
              tower: log.tower,
              floor: log.floor,
              supervisor: log.supervisor,
              executed: log.executed_today,
              hours: log.hours_worked,
              restriction: log.has_restriction,
              obs: log.observations,
            },
          });
        }
      });

    return events;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-4 w-4 text-accent" />
            Calendario de Eventos
          </CardTitle>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="min-w-[120px] text-center text-sm font-medium capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border">
          {dayNames.map((dayName) => (
            <div
              key={dayName}
              className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {dayName}
            </div>
          ))}

          {Array.from({ length: startDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="min-h-[100px] bg-card p-2" />
          ))}

          {days.map((day) => {
            const events = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] bg-card p-1.5 ${
                  isToday ? 'ring-2 ring-accent ring-inset' : ''
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    isToday ? 'font-bold text-accent' : 'text-muted-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                <div className="mt-1 space-y-0.5">
                  {events.slice(0, 4).map((event, index) => (
                    <div
                      key={`${event.type}-${event.label}-${index}`}
                      className={`${event.color} cursor-pointer truncate rounded px-1 py-0.5 text-[9px] leading-tight text-white`}
                      onMouseEnter={(e) =>
                        setTooltip({
                          rect: e.currentTarget.getBoundingClientRect(),
                          event,
                        })
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {event.type === 'start' ? '▶' : '📋'} {event.label}
                    </div>
                  ))}

                  {events.length > 4 && (
                    <div
                      className="cursor-pointer px-1 text-[9px] text-muted-foreground hover:text-foreground"
                      onMouseEnter={(e) =>
                        setTooltip({
                          rect: e.currentTarget.getBoundingClientRect(),
                          event: null,
                          allEvents: events,
                        })
                      }
                      onMouseLeave={() => setTooltip(null)}
                    >
                      +{events.length - 4} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {tooltip && (
          <div
            className="pointer-events-none fixed z-50 w-56 rounded-lg border border-border bg-popover p-3 text-xs shadow-xl"
            style={{
              top: tooltip.rect.bottom + 6,
              left: Math.min(tooltip.rect.left, window.innerWidth - 230),
            }}
          >
            {tooltip.allEvents ? (
              <div className="space-y-2">
                <p className="mb-1 font-semibold text-foreground">
                  Todas las actividades
                </p>

                {tooltip.allEvents.map((event, index) => (
                  <div key={`${event.type}-${event.label}-${index}`} className="flex items-start gap-1.5">
                    <span
                      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${event.color}`}
                    />
                    <span className="leading-tight text-muted-foreground">
                      {event.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="mb-1.5 font-semibold text-foreground">
                  {tooltip.event.detail.title}
                </p>

                {tooltip.event.type === 'start' ? (
                  <div className="space-y-1 text-muted-foreground">
                    {tooltip.event.detail.project && (
                      <p>📁 {tooltip.event.detail.project}</p>
                    )}
                    {tooltip.event.detail.tower && (
                      <p>
                        🏗️ {tooltip.event.detail.tower}
                        {tooltip.event.detail.floor &&
                          ` — ${tooltip.event.detail.floor}`}
                      </p>
                    )}
                    {tooltip.event.detail.crew && (
                      <p>👷 {tooltip.event.detail.crew}</p>
                    )}
                    {tooltip.event.detail.planned && (
                      <p>
                        📊 Plan: {tooltip.event.detail.planned}{' '}
                        {tooltip.event.detail.unit}
                      </p>
                    )}
                    {tooltip.event.detail.end && (
                      <p>📅 Término: {tooltip.event.detail.end}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 text-muted-foreground">
                    {tooltip.event.detail.project && (
                      <p>📁 {tooltip.event.detail.project}</p>
                    )}
                    {tooltip.event.detail.tower && (
                      <p>
                        🏗️ {tooltip.event.detail.tower}
                        {tooltip.event.detail.floor &&
                          ` — ${tooltip.event.detail.floor}`}
                      </p>
                    )}
                    {tooltip.event.detail.supervisor && (
                      <p>👤 {tooltip.event.detail.supervisor}</p>
                    )}
                    {tooltip.event.detail.executed != null && (
                      <p>✅ Ejecutado: {tooltip.event.detail.executed}</p>
                    )}
                    {tooltip.event.detail.hours && (
                      <p>⏱️ Horas: {tooltip.event.detail.hours}h</p>
                    )}
                    {tooltip.event.detail.restriction && (
                      <p className="font-medium text-red-600">⚠️ Con restricción</p>
                    )}
                    {tooltip.event.detail.obs && (
                      <p className="truncate">💬 {tooltip.event.detail.obs}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
            <span className="text-xs text-muted-foreground">Inicio actividad</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Reporte diario</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}