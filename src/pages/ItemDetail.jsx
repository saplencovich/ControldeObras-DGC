import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, CheckSquare, FileText, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';

import ItemInfo from '../components/detail/ItemInfo';
import DailyLogTable from '../components/detail/DailyLogTable';
import ChecklistSection from '../components/detail/ChecklistSection';
import WorkerProductivity from '../components/detail/WorkerProductivity';
import PhotoGallery from '../components/detail/PhotoGallery';
import DailyLogForm from '../components/forms/DailyLogForm';

function ItemDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function ItemDetail() {
  const { id: itemId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showLogForm, setShowLogForm] = useState(false);

  const queryOptions = {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  };

  const { data: allItems = [], isLoading: loadingItem } = useQuery({
    queryKey: ['masterItems'],
    queryFn: () => api.get('/master-items'),
    ...queryOptions,
  });

  const item = allItems.find((masterItem) => String(masterItem.id) === String(itemId));

  const { data: logs = [] } = useQuery({
    queryKey: ['dailyLogs', itemId],
    queryFn: () => api.get(`/daily-logs?master_item_id=${encodeURIComponent(itemId)}`),
    enabled: !!itemId,
    ...queryOptions,
  });

  const { data: checklistEntries = [] } = useQuery({
    queryKey: ['checklist', itemId],
    queryFn: () =>
      api.get(`/checklist-entries?master_item_id=${encodeURIComponent(itemId)}`),
    enabled: !!itemId,
    ...queryOptions,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers', itemId],
    queryFn: () => api.get(`/workers?master_item_id=${encodeURIComponent(itemId)}`),
    enabled: !!itemId,
    ...queryOptions,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['photos', itemId],
    queryFn: () =>
      api.get(`/site-photos?master_item_id=${encodeURIComponent(itemId)}`),
    enabled: !!itemId,
    ...queryOptions,
  });

  const handleToggleChecklist = async (itemName, existing) => {
    try {
      if (existing) {
        await api.put(`/checklist-entries/${existing.id}`, {
          ...existing,
          completed: !existing.completed,
          completed_by: existing.completed ? '' : user?.full_name || '',
          completed_date: existing.completed
            ? ''
            : format(new Date(), 'yyyy-MM-dd'),
        });
      } else {
        await api.post('/checklist-entries', {
          master_item_id: itemId,
          item_name: itemName,
          completed: true,
          completed_by: user?.full_name || '',
          completed_date: format(new Date(), 'yyyy-MM-dd'),
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['checklist', itemId] });
    } catch (error) {
      console.error('Error al actualizar checklist:', error);
    }
  };

  const handleSaveLog = async (data) => {
    try {
      const newLog = await api.post('/daily-logs', data);

      await queryClient.invalidateQueries({ queryKey: ['dailyLogs', itemId] });
      await queryClient.invalidateQueries({ queryKey: ['masterItems'] });

      return newLog;
    } catch (error) {
      console.error('Error al guardar reporte diario:', error);
      throw error;
    }
  };

  const handleCloseLogForm = () => {
    setShowLogForm(false);
    queryClient.invalidateQueries({ queryKey: ['photos', itemId] });
    queryClient.invalidateQueries({ queryKey: ['dailyLogs', itemId] });
  };

  if (loadingItem) {
    return <ItemDetailSkeleton />;
  }

  if (!item) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Ítem no encontrado</p>

        <Link to="/">
          <Button variant="outline" className="mt-4">
            Volver al Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Filtro defensivo: algunos endpoints pueden devolver todos los registros.
  // Asegura que esta vista solo muestre datos del ítem abierto.
  const scopedLogs = logs.filter(
    (log) => String(log.master_item_id) === String(itemId)
  );
  const scopedChecklistEntries = checklistEntries.filter(
    (entry) => String(entry.master_item_id) === String(itemId)
  );
  const scopedWorkers = workers.filter(
    (worker) => String(worker.master_item_id) === String(itemId)
  );
  const scopedPhotos = photos.filter(
    (photo) => String(photo.master_item_id) === String(itemId)
  );

  const completedChecklist = scopedChecklistEntries.filter((entry) => entry.completed).length;
  const totalExecutedInLogs = scopedLogs.reduce(
    (sum, log) => sum + (Number(log.executed_today) || 0),
    0
  );
  const productivityRows = scopedLogs.reduce(
    (sum, log) => sum + (Array.isArray(log.crew_workers) ? log.crew_workers.length : 0),
    0
  );

  const overviewCards = [
    {
      title: 'Reportes diarios',
      value: scopedLogs.length,
      hint: `Ejecutado en bitácora: ${totalExecutedInLogs}`,
      icon: FileText,
    },
    {
      title: 'Checklist',
      value: `${completedChecklist}/${Math.max(scopedChecklistEntries.length, 0)}`,
      hint: 'Ítems marcados',
      icon: CheckSquare,
    },
    {
      title: 'Registro fotográfico',
      value: scopedPhotos.length,
      hint: 'Fotos asociadas',
      icon: Camera,
    },
    {
      title: 'Productividad',
      value: productivityRows,
      hint: 'Registros individuales',
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Detalle del Ítem</h1>
          <p className="text-xs text-muted-foreground">
            {item.project} — {item.tower} — {item.floor} — {item.activity}
          </p>
        </div>
      </div>

      <ItemInfo item={item} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-lg font-semibold leading-tight">{card.value}</p>
                <p className="text-[11px] text-muted-foreground">{card.hint}</p>
              </div>
              <card.icon className="h-4 w-4 text-accent" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyLogTable logs={scopedLogs} onAddLog={() => setShowLogForm(true)} />

        <ChecklistSection
          entries={scopedChecklistEntries}
          onToggle={handleToggleChecklist}
        />
      </div>

      <WorkerProductivity logs={scopedLogs} workers={scopedWorkers} />

      <PhotoGallery
        photos={scopedPhotos}
        masterItemId={itemId}
        onPhotoAdded={() =>
          queryClient.invalidateQueries({ queryKey: ['photos', itemId] })
        }
      />

      <DailyLogForm
        open={showLogForm}
        onClose={handleCloseLogForm}
        onSave={handleSaveLog}
        masterItem={item}
        userName={user?.full_name}
      />
    </div>
  );
}