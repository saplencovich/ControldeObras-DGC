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
import ProjectForm from "../components/detail/forms/ProjectForm";
import MasterItemForm from "../components/detail/forms/MasterItemForm";
import DailyLogForm from "../components/detail/forms/DailyLogForm";

import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { itemHasFloor } from "@/utils/floors";

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
  const [editProject, setEditProject] = useState(null);
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
    userRole === "admin"
      ? projects
      : projects.filter((project) => hasAccessToProject(project.name));

  const filteredMasterItems =
    userRole === "admin"
      ? masterItems
      : masterItems.filter((item) => hasAccessToProject(item.project));

  const createProject = useMutation({
    mutationFn: (data) => api.post("/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => api.put(`/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["masterItems"] });
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["masterItems"] });
      queryClient.invalidateQueries({ queryKey: ["dailyLogs"] });
      queryClient.invalidateQueries({ queryKey: ["sitePhotos"] });
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

      return api.post("/daily-logs", {
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
    if (!itemHasFloor(item.floor, filters.floor)) return false;
    if (filters.activity && item.activity !== filters.activity) return false;
    if (filters.release && item.release_status !== filters.release)
      return false;

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

  const filteredItemIds = new Set(filteredItems.map((i) => Number(i.id)));
  const filteredLogs = dailyLogs.filter((log) => {
    if (!filteredItemIds.has(Number(log.master_item_id))) return false;
    if (!itemHasFloor(log.floor, filters.floor)) return false;

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
    previousData = null,
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
          editItem,
        );
      } else {
        const newItem = await createItem.mutateAsync(data);

        await logAudit(
          "crear",
          "MasterItem",
          newItem?.id || "nuevo",
          `Creó ítem "${data.activity}" (${data.project})`,
        );
      }

      setEditItem(null);
      setShowItemForm(false);
    } catch (error) {
      console.error("Error al guardar ítem:", error);
    }
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
      project: prev.project === project.name ? "" : prev.project,
    }));
    setEditProject(null);
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
      (photo) => photo.daily_log_id === logId,
    );

    for (const photo of relatedPhotos) {
      await api.delete(`/site-photos/${photo.id}`);
    }
  };

  const deleteDirectPhotosByItemId = async (itemId) => {
    const directPhotos = sitePhotos.filter(
      (photo) => photo.master_item_id === itemId && !photo.daily_log_id,
    );

    for (const photo of directPhotos) {
      await api.delete(`/site-photos/${photo.id}`);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `¿Eliminar ítem "${item.activity}" de ${item.project}?\nEsta acción también eliminará sus reportes diarios y fotos.`,
    );

    if (!confirmed) return;

    try {
      const relatedLogs = dailyLogs.filter(
        (log) => Number(log.master_item_id) === Number(item.id),
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
        item,
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
            0,
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
        log,
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

  if (userRole !== "admin" && filteredProjects.length === 0) {
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
      <KPICards masterItems={filteredItems} dailyLogs={filteredLogs} />

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        projects={filteredProjects}
        masterItems={filteredItems}
        filterOptionItems={filteredMasterItems}
        dailyLogs={filteredLogs}
        sitePhotos={sitePhotos}
        pdfMasterItems={masterItems}
        pdfDailyLogs={dailyLogs}
        pdfSitePhotos={sitePhotos}
        userName={user?.full_name || ''}
        onNewProject={handleOpenNewProject}
        onEditProject={handleOpenEditProject}
        onNewItem={() => {
          setEditItem(null);
          setShowItemForm(true);
        }}
        onRefresh={refreshAll}
      />

      <MasterPlanTable
        items={filteredItems}
        projects={projects}
        dailyLogs={filteredLogs}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDailyLog={handleDailyLog}
        onDeleteLog={handleDeleteLog}
      />

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <EventCalendar masterItems={filteredItems} dailyLogs={filteredLogs} />

        <CrewProductivity
          masterItems={filteredItems}
          dailyLogs={filteredLogs}
        />
      </div>

      <FloorProgress masterItems={filteredItems} />

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
        onSave={async (data) => {
          const log = await createLog.mutateAsync(data);

          // Guardar fotos en site-photos
          if (Array.isArray(data.photos) && data.photos.length > 0) {
            for (const photo of data.photos) {
              await api.post("/site-photos", {
                daily_log_id: log.id,
                master_item_id: data.master_item_id || dailyLogItem?.id,
                file_url: photo.file_url || photo.url || "",
                description: photo.description || "",
                label: photo.label || "reporte_diario",
                date:
                  photo.date ||
                  data.date ||
                  new Date().toISOString().split("T")[0],
              });
            }
          }

          // Invalidar con la key correcta que usa ItemDetail
          queryClient.invalidateQueries({ queryKey: ["sitePhotos"] });
          queryClient.invalidateQueries({ queryKey: ["photos"] }); // invalida todas las variantes

          return log;
        }}
        masterItem={dailyLogItem}
        project={projects.find((p) => p.name === dailyLogItem?.project)}
        userName={user?.full_name}
      />
    </div>
  );
}