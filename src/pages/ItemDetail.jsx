import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { api } from '@/lib/api';

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
  const { itemId } = useParams();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <h1 className="text-lg font-bold">Detalle del Ítem</h1>
      </div>

      <ItemInfo item={item} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DailyLogTable logs={logs} onAddLog={() => setShowLogForm(true)} />

        <ChecklistSection
          entries={checklistEntries}
          onToggle={handleToggleChecklist}
        />
      </div>

      <WorkerProductivity logs={logs} workers={workers} />

      <PhotoGallery
        photos={photos}
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