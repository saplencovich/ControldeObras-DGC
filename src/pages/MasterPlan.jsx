import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/PermissionsContext';
import { api } from '@/lib/api';

import MasterPlanTable from '../components/master-plan/MasterPlanTable';
import MasterItemForm from '../components/forms/MasterItemForm';
import DailyLogForm from '../components/forms/DailyLogForm';
import FilterBar from '../components/dashboard/FilterBar';
import ProjectForm from '../components/forms/ProjectForm';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { itemHasFloor } from '@/utils/floors';

export default function MasterPlan() {
  const { user } = useAuth();
  const { hasAccessToProject, userRole } = usePermissions();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    project: '',
    tower: '',
    floor: '',
    activity: '',
    release: '',
    search: '',
  });

  const [showItemForm, setShowItemForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [dailyLogItem, setDailyLogItem] = useState(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const { data: masterItems = [], isLoading } = useQuery({
    queryKey: ['masterItems'],
    queryFn: () => api.get('/master-items'),
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['dailyLogs'],
    queryFn: () => api.get('/daily-logs'),
  });

  const filteredProjects =
    userRole === 'admin'
      ? projects
      : projects.filter((p) => hasAccessToProject(p.name));

  const filteredMasterItems = masterItems.filter((item) =>
    hasAccessToProject(item.project)
  );

  const createProject = useMutation({
    mutationFn: (data) => api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => api.put(`/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['masterItems'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['masterItems'] });
      queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
    },
  });

  const createItem = useMutation({
    mutationFn: (data) => api.post('/master-items', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterItems'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => api.put(`/master-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterItems'] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id) => api.delete(`/master-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterItems'] });
    },
  });

  const createLog = useMutation({
    mutationFn: async (data) => api.post('/daily-logs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
      queryClient.invalidateQueries({ queryKey: ['masterItems'] });
    },
  });

  const filteredItems = filteredMasterItems.filter((item) => {
    if (filters.project && item.project !== filters.project) return false;
    if (filters.tower && item.tower !== filters.tower) return false;
    if (!itemHasFloor(item.floor, filters.floor)) return false;
    if (filters.activity && item.activity !== filters.activity) return false;
    if (filters.release && item.release_status !== filters.release) return false;

    if (filters.search) {
      const s = filters.search.toLowerCase();
      const searchable =
        `${item.project} ${item.tower} ${item.floor} ${item.activity} ${item.crew_name} ${item.restrictions}`.toLowerCase();

      if (!searchable.includes(s)) return false;
    }

    return true;
  });

  const filteredItemIds = new Set(filteredItems.map((item) => Number(item.id)));
  const filteredLogs = dailyLogs.filter((log) => {
    if (!filteredItemIds.has(Number(log.master_item_id))) return false;
    if (!itemHasFloor(log.floor, filters.floor)) return false;

    return true;
  });

  const handleSaveItem = async (data) => {
    if (editItem) {
      await updateItem.mutateAsync({ id: editItem.id, data });
    } else {
      await createItem.mutateAsync(data);
    }
    setEditItem(null);
  };

  const handleOpenNewProject = () => {
    setEditProject(null);
    setShowProjectForm(true);
  };

  const handleOpenEditProject = (selectedProject) => {
    const project =
      selectedProject || projects.find((p) => p.name === filters.project);
    if (!project) return;

    setEditProject(project);
    setShowProjectForm(true);
  };

  const handleSaveProject = async (data) => {
    if (editProject) {
      const previousName = editProject.name;
      await updateProject.mutateAsync({ id: editProject.id, data });

      if (filters.project === previousName) {
        setFilters((prev) => ({ ...prev, project: data.name }));
      }

      setEditProject(null);
      return;
    }

    await createProject.mutateAsync(data);
  };

  const handleDeleteProject = async (project) => {
    await deleteProject.mutateAsync(project.id);
    setFilters((prev) => ({
      ...prev,
      project: prev.project === project.name ? '' : prev.project,
    }));
    setEditProject(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (userRole !== 'admin' && filteredProjects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Sin Acceso a Obras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No tienes acceso a ninguna obra. Contacta al administrador para que te asigne permisos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Plan Maestro</h1>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        projects={filteredProjects}
        masterItems={filteredItems}
        filterOptionItems={filteredMasterItems}
        dailyLogs={filteredLogs}
        userName={user?.full_name || ''}
        onNewProject={handleOpenNewProject}
        onEditProject={handleOpenEditProject}
        onNewItem={() => {
          setEditItem(null);
          setShowItemForm(true);
        }}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['masterItems'] });
          queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
        }}
        showPdfExport={false}
      />

      <MasterPlanTable
        items={filteredItems}
        projects={projects}
        dailyLogs={filteredLogs}
        onEdit={(item) => {
          setEditItem(item);
          setShowItemForm(true);
        }}
        onDelete={(item) => {
          if (window.confirm(`¿Eliminar "${item.activity}"?`)) {
            deleteItem.mutate(item.id);
          }
        }}
        onDailyLog={(item) => {
          setDailyLogItem(item);
          setShowDailyLog(true);
        }}
        onDeleteLog={async (log) => {
          if (window.confirm(`¿Eliminar reporte del ${log.date}?`)) {
            await api.delete(`/daily-logs/${log.id}`);
            queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
            queryClient.invalidateQueries({ queryKey: ['masterItems'] });
          }
        }}
      />

      <ProjectForm
        open={showProjectForm}
        onClose={() => {
          setShowProjectForm(false);
          setEditProject(null);
        }}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
        editProject={editProject}
      />

      <MasterItemForm
        open={showItemForm}
        onClose={() => {
          setShowItemForm(false);
          setEditItem(null);
        }}
        onSave={handleSaveItem}
        editItem={editItem}
        projects={projects}
      />

      <DailyLogForm
        open={showDailyLog}
        onClose={() => {
          setShowDailyLog(false);
          setDailyLogItem(null);
        }}
        onSave={(data) => createLog.mutateAsync(data)}
        masterItem={dailyLogItem}
        project={projects.find((p) => p.name === dailyLogItem?.project)}
        userName={user?.full_name}
      />
    </div>
  );
}