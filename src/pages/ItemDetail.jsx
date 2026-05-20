import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, FileText, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { exportReportPDF } from '@/utils/exportPDF';

import ItemInfo from '../components/detail/ItemInfo';
import DailyLogTable from '../components/detail/DailyLogTable';
import WorkerProductivity from '../components/detail/WorkerProductivity';
import PhotoGallery from '../components/detail/PhotoGallery';
import DailyLogForm from '../components/forms/DailyLogForm';
import ItemScopeSummary from '../components/common/ItemScopeSummary';

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

  const item = allItems.find(
    (masterItem) => String(masterItem.id) === String(itemId)
  );

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
    ...queryOptions,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['dailyLogs', itemId],
    queryFn: () =>
      api.get(`/daily-logs?master_item_id=${encodeURIComponent(itemId)}`),
    enabled: !!itemId,
    ...queryOptions,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers', itemId],
    queryFn: () =>
      api.get(`/workers?master_item_id=${encodeURIComponent(itemId)}`),
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

  const handleSaveLog = async (data) => {
    try {
      const payload = { ...data };

      // Si la firma viene como base64 desde SignaturePad,
      // se sube como PNG a /uploads/signatures y se reemplaza por su ruta.
      if (
        payload.capataz_signature &&
        typeof payload.capataz_signature === 'string' &&
        payload.capataz_signature.startsWith('data:image/png;base64,')
      ) {
        const uploadedSignature = await api.post('/upload/signature', {
          imageBase64: payload.capataz_signature,
        });

        payload.capataz_signature = uploadedSignature.file_url;
      }

      // Se guarda el reporte con capataz_signature como ruta.
      // La firma NO se guarda en site_photos.
      const newLog = await api.post('/daily-logs', payload);

      // Solo las fotos reales del reporte se guardan en site_photos.
      if (Array.isArray(payload.photos) && payload.photos.length > 0) {
        for (const photo of payload.photos) {
          await api.post('/site-photos', {
            daily_log_id: newLog.id,
            master_item_id: payload.master_item_id || itemId,
            file_url: photo.file_url || photo.url || '',
            description: photo.description || '',
            label: photo.label || 'reporte_diario',
            date:
              photo.date ||
              payload.date ||
              new Date().toISOString().split('T')[0],
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['dailyLogs', itemId] });
      await queryClient.invalidateQueries({ queryKey: ['masterItems'] });
      await queryClient.invalidateQueries({ queryKey: ['photos', itemId] });

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

  const handleDeleteLog = async (log) => {
    const confirmed = window.confirm(`¿Eliminar el reporte del ${log.date}?`);
    if (!confirmed) return;

    try {
      if (item) {
        await api.put(`/master-items/${item.id}`, {
          ...item,
          executed_qty: Math.max(
            Number(item.executed_qty || 0) - Number(log.executed_today || 0),
            0
          ),
        });
      }

      const relatedPhotos = photos.filter(
        (photo) => photo.daily_log_id === log.id
      );

      for (const photo of relatedPhotos) {
        await api.delete(`/site-photos/${photo.id}`);
      }

      await api.delete(`/daily-logs/${log.id}`);

      await api
        .post('/audit-logs', {
          action: 'eliminar',
          entity_name: 'DailyLog',
          entity_id: log.id,
          user_name: user?.full_name || '',
          user_email: user?.email || '',
          description: `Eliminó reporte del ${log.date} (${
            item?.activity || ''
          } - ${item?.project || ''})`,
          previous_data: JSON.stringify(log),
        })
        .catch((e) => console.warn(e));

      await queryClient.invalidateQueries({ queryKey: ['dailyLogs', itemId] });
      await queryClient.invalidateQueries({ queryKey: ['masterItems'] });
      await queryClient.invalidateQueries({ queryKey: ['photos', itemId] });
    } catch (error) {
      console.error('Error al eliminar reporte:', error);
    }
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

  const scopedLogs = logs.filter(
    (log) => String(log.master_item_id) === String(itemId)
  );

  const scopedWorkers = workers.filter(
    (worker) => String(worker.master_item_id) === String(itemId)
  );

  const scopedPhotos = photos.filter(
    (photo) => String(photo.master_item_id) === String(itemId)
  );

  const projectSupervisor =
    projects.find((project) => project.name === item.project)?.supervisor || '';

  const projectForItem =
    projects.find((project) => project.name === item.project) || null;

  const totalExecutedInLogs = scopedLogs.reduce(
    (sum, log) => sum + (Number(log.executed_today) || 0),
    0
  );

  const productivityRows = scopedLogs.reduce(
    (sum, log) =>
      sum + (Array.isArray(log.crew_workers) ? log.crew_workers.length : 0),
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

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold">Detalle del Ítem</h1>
          <ItemScopeSummary item={item} />
        </div>


        <Button
          variant="outline"
          onClick={() =>
            exportReportPDF(
              [item],
              scopedLogs,
              scopedPhotos,
              [],
              projectForItem ? [projectForItem] : [],
              projectSupervisor
            )
          }
        >
          Exportar PDF
        </Button>
      </div>

      <ItemInfo item={item} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {overviewCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-lg font-semibold leading-tight">
                  {card.value}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {card.hint}
                </p>
              </div>
              <card.icon className="h-4 w-4 text-accent" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="w-full">
        <DailyLogTable
          logs={scopedLogs}
          onAddLog={() => setShowLogForm(true)}
          onDeleteLog={handleDeleteLog}
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
        project={projectForItem}
        userName={user?.full_name}
      />
    </div>
  );
}