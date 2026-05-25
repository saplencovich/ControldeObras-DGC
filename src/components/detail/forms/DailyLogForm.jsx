import React, { useEffect, useRef, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import {
  Plus,
  Trash2,
  Users,
  Camera,
  X,
  TrendingUp,
  TrendingDown,
  Target,
  PenTool,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import ItemScopeSummary from "@/components/common/ItemScopeSummary";

import SignaturePad from "./SignaturePad";

const SERVER_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001/api"
).replace(/\/api\/?$/, "");

const REQUIRE_PHOTO = false;
const REQUIRE_SIGNATURE = true;
const REQUIRE_CAPATAZ = true;

const EMPTY_WORKER = {
  name: "",
  role: "",
  hours: "",
  executed: "",
};

const getInitialForm = (userName = "") => ({
  date: format(new Date(), "yyyy-MM-dd"),
  supervisor: userName || "",
  crew_name: "",
  executed_today: "",
  hours_worked: "",
  has_restriction: false,
  restriction_detail: "",
  observations: "",
  capataz_name: "",
});

function buildCrewWorkers(workers) {
  return workers
    .filter((worker) => worker.name?.trim() && worker.role?.trim())
    .map((worker) => ({
      name: worker.name.trim(),
      role: worker.role.trim(),
      hours: Number(worker.hours) || 0,
      executed: Number(worker.executed) || 0,
    }));
}

function getCrewMembers(masterItem) {
  if (!masterItem?.crew_members) return [];
  if (Array.isArray(masterItem.crew_members)) return masterItem.crew_members;

  try {
    const parsed = JSON.parse(masterItem.crew_members);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function calculateTotalHours(formHoursWorked, crewWorkers) {
  if (formHoursWorked) return Number(formHoursWorked);

  return crewWorkers.reduce((maxHours, worker) => {
    return Math.max(maxHours, Number(worker.hours || 0));
  }, 0);
}

function getRemainingQty(masterItem) {
  if (!masterItem) return 0;

  return Math.max(
    Number(masterItem.planned_qty || 0) - Number(masterItem.executed_qty || 0),
    0
  );
}

function getPhotoSrc(photo) {
  if (!photo) return "";
  if (photo.url?.startsWith("http")) return photo.url;
  if (photo.url?.startsWith("/uploads")) return `${SERVER_URL}${photo.url}`;
  if (photo.file_url?.startsWith("http")) return photo.file_url;
  if (photo.file_url?.startsWith("/uploads")) {
    return `${SERVER_URL}${photo.file_url}`;
  }
  return photo.url || photo.file_url || "";
}

export default function DailyLogForm({
  open,
  onClose,
  onSave,
  masterItem,
  project,
  userName,
}) {
  const [form, setForm] = useState(getInitialForm(userName));
  const [workers, setWorkers] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [error, setError] = useState("");

  const { data: allLogs = [] } = useQuery({
    queryKey: ["allDailyLogsForAutocomplete"],
    queryFn: () => api.get("/daily-logs"),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  const { data: allWorkers = [] } = useQuery({
    queryKey: ["allWorkersForAutocomplete"],
    queryFn: () => api.get("/project-workers"),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  const { data: supervisors = [] } = useQuery({
    queryKey: ["users-supervisors"],
    queryFn: () => api.get("/users/list?role=supervisor"),
    enabled: open,
  });

  const { data: capataces = [] } = useQuery({
    queryKey: ["users-viewers"],
    queryFn: () => api.get("/users/list?role=viewer"),
    enabled: open,
  });

  const currentProjectWorkers = allWorkers.filter(
    (w) => w.project === masterItem?.project
  );

  const logWorkers = allLogs
    .filter((log) => log.project === masterItem?.project)
    .flatMap((log) => log.crew_workers || []);
  const allWorkerData = [...currentProjectWorkers, ...logWorkers];

  const uniqueWorkerNames = Array.from(
    new Set(allWorkerData.map((worker) => worker.name).filter(Boolean))
  ).sort();

  const uniqueWorkerRoles = Array.from(
    new Set(allWorkerData.map((worker) => worker.role).filter(Boolean))
  ).sort();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      photos.forEach((photo) => {
        if (photo.is_uploaded && photo.filename) {
          api.delete(`/upload/${photo.filename}`).catch(() => {});
        }
      });
      return;
    }

    setForm({
      ...getInitialForm(userName),
      supervisor: project?.supervisor || userName || "",
      crew_name: masterItem?.crew_name || "",
      capataz_name: project?.capataz || "",
    });

    const crewMembers = getCrewMembers(masterItem);

    if (crewMembers.length > 0) {
      setWorkers(
        crewMembers.map((member) => ({
          name: member.name || "",
          role: member.role || "",
          hours: "",
          executed: "",
        }))
      );
    } else {
      setWorkers([]);
    }

    setPhotos([]);
    setSaving(false);
    setUploadingPhotos(false);
    setShowSignaturePad(false);
    setSignatureImage(null);
    setError("");
  }, [open, masterItem, project, userName]);

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const addWorker = () => {
    setWorkers((prev) => [...prev, { ...EMPTY_WORKER }]);
  };

  const removeWorker = (index) => {
    setWorkers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateWorker = (index, field, value) => {
    setWorkers((prev) =>
      prev.map((worker, idx) => {
        if (idx !== index) return worker;
        const updated = { ...worker, [field]: value };
        if (field === "name") {
          const projectWorker = allWorkers.find(
            (w) => w.project === masterItem?.project && w.name === value
          );
          if (projectWorker) {
            updated.role = projectWorker.role || "";
          }
        }
        return updated;
      })
    );
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploadingPhotos(true);
      setError("");

      for (const file of files) {
        const uploadedPhoto = await api.uploadPhoto(file);

        setPhotos((prev) => [
          ...prev,
          {
            url: uploadedPhoto.file_url,
            file_url: uploadedPhoto.file_url,
            description: "",
            file_name: uploadedPhoto.original_name || file.name,
            filename: uploadedPhoto.filename,
            mimetype: uploadedPhoto.mimetype,
            size: uploadedPhoto.size,
            is_uploaded: true,
          },
        ]);
      }
    } catch (error) {
      console.error("Error al subir foto:", error);
      setError(error.message || "Error al subir foto.");
    } finally {
      setUploadingPhotos(false);
      event.target.value = "";
    }
  };

  const removePhoto = async (index) => {
    const photo = photos[index];

    if (photo.is_uploaded && photo.filename) {
      try {
        await api.delete(`/upload/${photo.filename}`);
      } catch (err) {
        console.warn("No se pudo eliminar archivo temporal:", err.message);
      }
    }

    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updatePhotoDescription = (index, value) => {
    setPhotos((prev) =>
      prev.map((photo, idx) =>
        idx === index ? { ...photo, description: value } : photo
      )
    );
  };

  const getDailyGoalInfo = () => {
    if (!masterItem || !form.executed_today) return null;

    const remaining = getRemainingQty(masterItem);
    if (remaining <= 0) return null;

    let dailyGoal;

    if (masterItem.start_date && masterItem.end_date) {
      const totalDays =
        differenceInCalendarDays(
          new Date(masterItem.end_date),
          new Date(masterItem.start_date)
        ) + 1;

      const daysPassed =
        differenceInCalendarDays(
          new Date(form.date),
          new Date(masterItem.start_date)
        ) + 1;

      const daysLeft = Math.max(totalDays - daysPassed + 1, 1);
      dailyGoal = Math.ceil(remaining / daysLeft);
    } else {
      dailyGoal = Math.ceil(remaining / 5);
    }

    const todayQty = Number(form.executed_today) || 0;

    return {
      dailyGoal,
      todayQty,
      remaining,
      planned: Number(masterItem.planned_qty || 0),
      onTarget: todayQty >= dailyGoal,
    };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      if (!masterItem) throw new Error("No hay ítem maestro asociado.");
      if (!form.date) throw new Error("Debe ingresar la fecha del reporte.");
      if (!form.supervisor?.trim()) {
        throw new Error("Debe seleccionar un supervisor.");
      }
      if (!form.crew_name?.trim()) {
        throw new Error("Debe ingresar la cuadrilla.");
      }
      if (!form.executed_today || Number(form.executed_today) <= 0) {
        throw new Error("Debe ingresar la cantidad ejecutada hoy.");
      }
      if (!form.hours_worked || Number(form.hours_worked) <= 0) {
        throw new Error("Debe ingresar las horas trabajadas.");
      }
      if (!form.observations.trim()) {
        throw new Error("Debe ingresar observaciones.");
      }
      if (form.has_restriction && !form.restriction_detail.trim()) {
        throw new Error("Debe ingresar el detalle de la restriccion.");
      }
      if (uploadingPhotos) {
        throw new Error("Espera a que terminen de subir las fotos.");
      }

      const remainingQty = getRemainingQty(masterItem);
      const executedToday = Number(form.executed_today);

      if (remainingQty <= 0) {
        throw new Error("Este ítem ya alcanzó la cantidad planificada.");
      }

      if (executedToday > remainingQty) {
        throw new Error(
          `La cantidad ejecutada hoy no puede superar el pendiente (${remainingQty} ${
            masterItem.unit || "und"
          }).`
        );
      }

      if (REQUIRE_PHOTO && photos.length === 0) {
        throw new Error("Debe cargar al menos una foto del sitio.");
      }

      if (REQUIRE_CAPATAZ && !form.capataz_name?.trim()) {
        throw new Error("Debe ingresar el nombre del capataz.");
      }

      if (REQUIRE_SIGNATURE && !signatureImage) {
        throw new Error("Debe dibujar la firma del capataz.");
      }

      const crewWorkers = buildCrewWorkers(workers);

      if (crewWorkers.length === 0) {
        throw new Error("Debe agregar al menos una persona en personal presente.");
      }

      if (
        workers.some((worker) => {
          const hasAnyValue =
            worker.name.trim() ||
            worker.role.trim() ||
            worker.hours ||
            worker.executed;

          return (
            hasAnyValue &&
            (!worker.name.trim() ||
              !worker.role.trim() ||
              !worker.hours ||
              Number(worker.hours) <= 0 ||
              !worker.executed ||
              Number(worker.executed) < 0)
          );
        })
      ) {
        throw new Error(
          "Cada persona presente debe tener nombre, cargo, horas y ejecutado."
        );
      }

      const totalHours = calculateTotalHours(form.hours_worked, crewWorkers);

      if (totalHours > 10) {
        throw new Error("No se pueden registrar más de 10 horas en un día.");
      }

      await onSave({
        ...form,
        crew_name: form.crew_name || masterItem?.crew_name || "",
        executed_today: executedToday,
        hours_worked: totalHours,
        crew_workers: crewWorkers,
        capataz_signature: signatureImage,
        master_item_id: masterItem.id,
        project: masterItem.project,
        tower: masterItem.tower,
        floor: masterItem.floor,
        activity: masterItem.activity,
        photos: photos.map((photo) => ({
          file_url: photo.file_url || photo.url || "",
          url: photo.file_url || photo.url || "",
          description: photo.description || "",
          label: "reporte_diario",
          date: form.date,
          file_name: photo.file_name || "",
        })),
      });

      onClose();
    } catch (error) {
      console.error("Error al guardar reporte:", error);
      setError(error.message || "Error al guardar reporte.");
    } finally {
      setSaving(false);
    }
  };

  const goalInfo = getDailyGoalInfo();
  const remainingQty = getRemainingQty(masterItem);
  const executedTodayQty = Number(form.executed_today || 0);
  const isSupervisorFixed = Boolean(project?.supervisor);
  const isCapatazFixed = Boolean(project?.capataz);
  const isCrewNameFixed = Boolean(masterItem?.crew_name);

  const hasInvalidWorker = workers.some((worker) => {
    const hasAnyValue =
      worker.name.trim() || worker.role.trim() || worker.hours || worker.executed;

    return (
      hasAnyValue &&
      (!worker.name.trim() ||
        !worker.role.trim() ||
        !worker.hours ||
        Number(worker.hours) <= 0 ||
        !worker.executed ||
        Number(worker.executed) < 0)
    );
  });

  const isSaveDisabled =
    !form.date ||
    !form.supervisor.trim() ||
    !form.crew_name.trim() ||
    !form.executed_today ||
    Number(form.executed_today) <= 0 ||
    !form.hours_worked ||
    Number(form.hours_worked) <= 0 ||
    !form.observations.trim() ||
    (form.has_restriction && !form.restriction_detail.trim()) ||
    buildCrewWorkers(workers).length === 0 ||
    hasInvalidWorker ||
    remainingQty <= 0 ||
    executedTodayQty > remainingQty ||
    saving ||
    uploadingPhotos ||
    (REQUIRE_PHOTO && photos.length === 0) ||
    (REQUIRE_CAPATAZ && !form.capataz_name?.trim()) ||
    (REQUIRE_SIGNATURE && !signatureImage);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>Reporte Diario</DialogTitle>
          {masterItem && <ItemScopeSummary item={masterItem} className="pt-1" />}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => updateFormField("date", e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Supervisor</Label>
              <Select
                value={form.supervisor}
                onValueChange={(v) => updateFormField("supervisor", v)}
                disabled={isSupervisorFixed}
              >
                <SelectTrigger disabled={isSupervisorFixed}>
                  <SelectValue placeholder="Seleccionar supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.length === 0 ? (
                    <SelectItem value="__none_s__" disabled>
                      Sin supervisores registrados
                    </SelectItem>
                  ) : (
                    supervisors.map((u) => (
                      <SelectItem key={u.id} value={u.full_name}>
                        {u.full_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {isSupervisorFixed && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Supervisor fijado por la obra seleccionada.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Cuadrilla</Label>
            <Input
              value={form.crew_name}
              onChange={(e) => updateFormField("crew_name", e.target.value)}
              placeholder="Ej: Cuadrilla Eléctrica A"
              disabled={isCrewNameFixed}
            />

            {isCrewNameFixed && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Cuadrilla fijada por el ítem maestro.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Ejecutado hoy *</Label>
              <Input
                type="number"
                min="0"
                max={remainingQty || undefined}
                value={form.executed_today}
                onChange={(e) =>
                  updateFormField("executed_today", e.target.value)
                }
              />

              {masterItem && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Máximo permitido: {remainingQty} {masterItem.unit || "und"}.
                </p>
              )}

              {goalInfo && (
                <div
                  className={`mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                    goalInfo.onTarget
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {goalInfo.onTarget ? (
                    <>
                      <TrendingUp className="h-3 w-3" />
                      <span>
                        Dentro de meta. Meta: {goalInfo.dailyGoal}{" "}
                        {masterItem?.unit || "und"}/día
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3" />
                      <span>
                        Bajo meta. Meta: {goalInfo.dailyGoal}{" "}
                        {masterItem?.unit || "und"}/día
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Horas trabajadas</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="Se calcula del personal si se deja vacío"
                value={form.hours_worked}
                onChange={(e) =>
                  updateFormField("hours_worked", e.target.value)
                }
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Máximo recomendado: 10h/día.
              </p>
            </div>
          </div>

          {masterItem && (
            <div className="flex flex-wrap gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span>
                <Target className="mr-0.5 inline h-3 w-3" />
                Total:{" "}
                <b>
                  {masterItem.planned_qty} {masterItem.unit || "und"}
                </b>
              </span>
              <span>
                Ejecutado acum.: <b>{masterItem.executed_qty || 0}</b>
              </span>
              <span>
                Pendiente: <b>{remainingQty}</b>
              </span>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Users className="h-3.5 w-3.5" />
                Personal presente
              </Label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={addWorker}
              >
                <Plus className="h-3 w-3" />
                Agregar
              </Button>
            </div>

            {workers.length === 0 && (
              <p className="py-2 text-xs italic text-muted-foreground">
                Sin personal registrado. Puedes agregar trabajadores si lo
                necesitas.
              </p>
            )}

            <div className="space-y-2">
              {workers.map((worker, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-md border border-border/60 p-2 sm:grid-cols-[minmax(140px,1.4fr)_minmax(120px,1fr)_96px_112px_32px] sm:items-center sm:border-0 sm:p-0"
                >
                  <AutocompleteInput
                    placeholder="Nombre"
                    className="h-8 text-xs"
                    value={worker.name}
                    onChange={(e) =>
                      updateWorker(index, "name", e.target.value)
                    }
                    options={uniqueWorkerNames}
                  />

                  <AutocompleteInput
                    placeholder="Cargo"
                    className="h-8 text-xs"
                    value={worker.role}
                    onChange={(e) =>
                      updateWorker(index, "role", e.target.value)
                    }
                    options={uniqueWorkerRoles}
                  />

                  <Input
                    type="number"
                    placeholder="Horas"
                    className="h-8 text-xs"
                    value={worker.hours}
                    onChange={(e) =>
                      updateWorker(index, "hours", e.target.value)
                    }
                  />

                  <Input
                    type="number"
                    placeholder="Ejecutado"
                    className="h-8 text-xs"
                    value={worker.executed}
                    onChange={(e) =>
                      updateWorker(index, "executed", e.target.value)
                    }
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 justify-self-end text-red-500"
                    onClick={() => removeWorker(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {workers.length > 0 && (
                <p className="hidden text-[10px] text-muted-foreground sm:block">
                  Columnas: Nombre / Cargo / Horas / Ejecutado
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.has_restriction}
              onCheckedChange={(value) =>
                updateFormField("has_restriction", value)
              }
            />
            <Label className="text-xs">¿Tiene restricción?</Label>
          </div>

          {form.has_restriction && (
            <div>
              <Label className="text-xs">Detalle de restricción</Label>
              <Textarea
                value={form.restriction_detail}
                onChange={(e) =>
                  updateFormField("restriction_detail", e.target.value)
                }
                className="h-16"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Observaciones</Label>
            <Textarea
              value={form.observations}
              onChange={(e) => updateFormField("observations", e.target.value)}
              className="h-16"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Camera className="h-3.5 w-3.5" />
                Fotos del reporte{" "}
                {REQUIRE_PHOTO ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground">(opcional)</span>
                )}
              </Label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingPhotos}
                >
                  <Camera className="h-3 w-3" />
                  Cámara
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhotos}
                >
                  <Plus className="h-3 w-3" />
                  {uploadingPhotos ? "Subiendo..." : "Galería"}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {REQUIRE_PHOTO && photos.length === 0 && (
              <p className="text-xs font-medium italic text-destructive/70">
                Obligatorio cargar al menos una foto.
              </p>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={getPhotoSrc(photo)}
                    alt={photo.description || "foto"}
                    className="h-28 w-full object-cover"
                  />

                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                    onClick={() => removePhoto(index)}
                  >
                    <X className="h-3 w-3" />
                  </button>

                  <input
                    type="text"
                    placeholder="Descripción (opcional)"
                    value={photo.description}
                    onChange={(e) =>
                      updatePhotoDescription(index, e.target.value)
                    }
                    className="w-full border-t border-border bg-background px-2 py-1 text-[10px] focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label className="block text-xs font-semibold">
              Validación del Capataz{" "}
              {!REQUIRE_CAPATAZ && (
                <span className="text-muted-foreground">(opcional)</span>
              )}
            </Label>

            <div>
              <Label className="text-xs">Nombre del capataz</Label>

              <Select
                value={form.capataz_name}
                onValueChange={(v) => updateFormField("capataz_name", v)}
                disabled={isCapatazFixed}
              >
                <SelectTrigger disabled={isCapatazFixed}>
                  <SelectValue placeholder="Seleccionar capataz" />
                </SelectTrigger>

                <SelectContent>
                  {capataces.length === 0 ? (
                    <SelectItem value="__none_c__" disabled>
                      Sin capataces registrados
                    </SelectItem>
                  ) : (
                    capataces.map((u) => (
                      <SelectItem key={u.id} value={u.full_name}>
                        {u.full_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              {isCapatazFixed && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Capataz fijado por la obra seleccionada.
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">
                Firma del capataz{" "}
                {REQUIRE_SIGNATURE ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground">(opcional)</span>
                )}
              </Label>

              {!showSignaturePad ? (
                <>
                  {signatureImage ? (
                    <div className="flex items-end gap-2">
                      <img
                        src={signatureImage}
                        alt="firma"
                        className="h-16 rounded-lg border border-border bg-white p-2"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSignaturePad(true)}
                      >
                        Cambiar firma
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setShowSignaturePad(true)}
                    >
                      <PenTool className="h-4 w-4" />
                      Dibujar firma
                    </Button>
                  )}
                </>
              ) : (
                <SignaturePad
                  onSave={(signature) => {
                    setSignatureImage(signature);
                    setShowSignaturePad(false);
                  }}
                  onCancel={() => setShowSignaturePad(false)}
                />
              )}
            </div>

            <p className="text-[10px] italic text-muted-foreground">
              La firma se guardará como archivo PNG asociado al reporte diario.
              No aparecerá en la galería fotográfica del ítem.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={isSaveDisabled}>
            {saving
              ? "Guardando..."
              : uploadingPhotos
                ? "Subiendo fotos..."
                : "Guardar Reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}