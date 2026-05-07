import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/lib/PermissionsContext";
import { api } from "@/lib/api";

import KPICards from "../components/dashboard/KPICards";
import EventCalendar from "../components/dashboard/EventCalendar";
import CrewProductivity from "../components/dashboard/CrewProductivity";
import FloorProgress from "../components/dashboard/FloorProgress";
import FilterBar from "../components/dashboard/FilterBar";
import MasterPlanTable from "../components/master-plan/MasterPlanTable";
import ProjectForm from "../components/forms/ProjectForm";
import MasterItemForm from "../components/forms/MasterItemForm";
import DailyLogForm from "../components/forms/DailyLogForm";

import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-32 rounded-md" />
          ))}
          <Skeleton className="h-9 min-w-[200px] flex-1 rounded-md" />
        </div>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-28 rounded-md" />
          ))}
        </div>
      </div>

      <Skeleton className="h-[420px] rounded-xl" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[320px] rounded-xl" />
      </div>

      <Skeleton className="h-[360px] rounded-xl" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { hasAccessToProject, userRole } = usePermissions();
  const queryClient = useQueryClient();

  const isLocalMode = true;

  const [filters, setFilters] = useState({
    project: "",
    tower: "",
    floor: "",
    activity: "",
    release: "",
    search: "",
  });

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [dailyLogItem, setDailyLogItem] = useState(null);

  const queryOptions = {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  };

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects"),
    ...queryOptions,
  });

  const { data: masterItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ["masterItems"],
    queryFn: () => api.get("/master-items"),
    ...queryOptions,
  });

  const { data: dailyLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["dailyLogs"],
    queryFn: () => api.get("/daily-logs"),
    ...queryOptions,
  });

  const { data: sitePhotos = [] } = useQuery({
    queryKey: ["sitePhotos"],
    queryFn: () => api.get("/site-photos"),
    ...queryOptions,
  });

  const filteredProjects =
    isLocalMode || userRole === "admin"
      ? projects
      : projects.filter((project) => hasAccessToProject(project.name));

  const filteredMasterItems =
    isLocalMode || userRole === "admin"
      ? masterItems
      : masterItems.filter((item) => hasAccessToProject(item.project));

  const createProject = useMutation({
    mutationFn: (data) => api.post("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const createItem = useMutation({
    mutationFn: (data) => api.post("/master-items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterItems"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => api.put(`/master-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterItems"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id) => api.delete(`/master-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterItems"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const createLog = useMutation({
    mutationFn: (data) => {
      const masterItemId = data.master_item_id || dailyLogItem?.id;

      if (!masterItemId) {
        throw new Error("No se encontró el ítem asociado al reporte diario");
      }

      return api.post('/daily-logs', {
        ...data,
        master_item_id: masterItemId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      queryClient.invalidateQueries({ queryKey: ["masterItems"] });
    },
  });

  const filteredItems = filteredMasterItems.filter((item) => {
    if (filters.project && item.project !== filters.project) return false;
    if (filters.tower && item.tower !== filters.tower) return false;
    if (filters.floor && item.floor !== filters.floor) return false;
    if (filters.activity && item.activity !== filters.activity) return false;
    if (filters.release && item.release_status !== filters.release) return false;

    if (filters.search) {
      const search = filters.search.toLowerCase();

      const searchable = `
        ${item.project || ""}
        ${item.tower || ""}
        ${item.floor || ""}
        ${item.activity || ""}
        ${item.crew_name || ""}
        ${item.restrictions || ""}
      `.toLowerCase();

      if (!searchable.includes(search)) return false;
    }

    return true;
  });

  const handleEdit = (item) => {
    setEditItem(item);
    setShowItemForm(true);
  };

  const logAudit = async (
    action,
    entityName,
    entityId,
    description,
    previousData = null
  ) => {
    try {
      await api.post("/audit-logs", {
        action,
        entity_name: entityName,
        entity_id: entityId,
        user_name: user?.full_name || "",
        user_email: user?.email || "",
        description,
        previous_data: previousData ? JSON.stringify(previousData) : null,
      });
    } catch (error) {
      console.warn("No se pudo guardar auditoría:", error.message);
    }
  };

  const handleSaveItem = async (data) => {
    try {
      if (editItem) {
        await updateItem.mutateAsync({ id: editItem.id, data });

        await logAudit(
          "editar",
          "MasterItem",
          editItem.id,
          `Editó ítem "${data.activity || editItem.activity}" (${
            data.project || editItem.project
          })`,
          editItem
        );
      } else {
        const newItem = await createItem.mutateAsync(data);

        await logAudit(
          "crear",
          "MasterItem",
          newItem?.id || "nuevo",
          `Creó ítem "${data.activity}" (${data.project})`
        );
      }

      setEditItem(null);
      setShowItemForm(false);
    } catch (error) {
      console.error("Error al guardar ítem:", error);
    }
  };

  const handleSaveItemAndLog = async (data) => {
    try {
      const newItem = await createItem.mutateAsync(data);

      setEditItem(null);
      setShowItemForm(false);
      setDailyLogItem(newItem);
      setShowDailyLog(true);
    } catch (error) {
      console.error("Error al guardar item y abrir log:", error);
    }
  };

  const deletePhotosByLogId = async (logId) => {
    const relatedPhotos = sitePhotos.filter(
      (photo) => photo.daily_log_id === logId
    );

    for (const photo of relatedPhotos) {
      await api.delete(`/site-photos/${photo.id}`);
    }
  };

  const deleteDirectPhotosByItemId = async (itemId) => {
    const directPhotos = sitePhotos.filter(
      (photo) => photo.master_item_id === itemId && !photo.daily_log_id
    );

    for (const photo of directPhotos) {
      await api.delete(`/site-photos/${photo.id}`);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `¿Eliminar ítem "${item.activity}" de ${item.project}?\nEsta acción también eliminará sus reportes diarios y fotos.`
    );

    if (!confirmed) return;

    try {
      const relatedLogs = dailyLogs.filter(
        (log) => Number(log.master_item_id) === Number(item.id)
      );

      for (const log of relatedLogs) {
        await deletePhotosByLogId(log.id);
        await api.delete(`/daily-logs/${log.id}`);
      }

      await deleteDirectPhotosByItemId(item.id);
      await deleteItem.mutateAsync(item.id);

      await logAudit(
        "eliminar",
        "MasterItem",
        item.id,
        `Eliminó ítem "${item.activity}" (${item.project} ${item.tower || ""} ${
          item.floor || ""
        })`,
        item
      );

      await queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      await queryClient.invalidateQueries({ queryKey: ["sitePhotos"] });
    } catch (error) {
      console.error("Error al eliminar ítem:", error);
    }
  };

  const handleDeleteLog = async (log, item) => {
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

      await deletePhotosByLogId(log.id);
      await api.delete(`/daily-logs/${log.id}`);

      await logAudit(
        "eliminar",
        "DailyLog",
        log.id,
        `Eliminó reporte del ${log.date} (${item?.activity || ""} - ${
          item?.project || ""
        })`,
        log
      );

      await queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      await queryClient.invalidateQueries({ queryKey: ["masterItems"] });
      await queryClient.invalidateQueries({ queryKey: ["sitePhotos"] });
    } catch (error) {
      console.error("Error al eliminar reporte:", error);
    }
  };

  const handleDailyLog = (item) => {
    setDailyLogItem(item);
    setShowDailyLog(true);
  };

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["masterItems"] }),
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] }),
      queryClient.invalidateQueries({ queryKey: ["sitePhotos"] }),
    ]);
  };

  if (loadingProjects || loadingItems || loadingLogs) {
    return <DashboardSkeleton />;
  }

  if (!isLocalMode && userRole !== "admin" && filteredProjects.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Sin Acceso a Obras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No tienes acceso a ninguna obra. Contacta al administrador para
              que te asigne permisos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KPICards masterItems={filteredItems} dailyLogs={dailyLogs} />

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        projects={filteredProjects}
        masterItems={filteredItems}
        dailyLogs={dailyLogs}
        sitePhotos={sitePhotos}
        onNewProject={() => setShowProjectForm(true)}
        onNewItem={() => {
          setEditItem(null);
          setShowItemForm(true);
        }}
        onRefresh={refreshAll}
      />

      <MasterPlanTable
        items={filteredItems}
        dailyLogs={dailyLogs}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDailyLog={handleDailyLog}
        onDeleteLog={handleDeleteLog}
      />

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <EventCalendar masterItems={filteredMasterItems} dailyLogs={dailyLogs} />

        <CrewProductivity
          masterItems={filteredMasterItems}
          dailyLogs={dailyLogs}
        />
      </div>

      <FloorProgress masterItems={filteredItems} />

      <ProjectForm
        open={showProjectForm}
        onClose={() => setShowProjectForm(false)}
        onSave={(data) => createProject.mutateAsync(data)}
      />

      <MasterItemForm
        open={showItemForm}
        onClose={() => {
          setShowItemForm(false);
          setEditItem(null);
        }}
        onSave={handleSaveItem}
        onSaveAndLog={handleSaveItemAndLog}
        editItem={editItem}
        projects={projects}
      />

      <DailyLogForm
        open={showDailyLog}
        onClose={() => {
          setShowDailyLog(false);
          setDailyLogItem(null);
        }}
        onSave={(data) =>
          createLog.mutateAsync(data).then((log) => {
            queryClient.invalidateQueries({ queryKey: ["sitePhotos"] });
            return log;
          })
        }
        masterItem={dailyLogItem}
        userName={user?.full_name}
      />
    </div>
  );
}