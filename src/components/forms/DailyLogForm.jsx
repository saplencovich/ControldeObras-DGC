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
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

import SignaturePad from "./SignaturePad";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const REQUIRE_PHOTO = false;
const REQUIRE_SIGNATURE = false;
const REQUIRE_CAPATAZ = false;

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
    .filter((worker) => worker.name?.trim())
    .map((worker) => ({
      name: worker.name.trim(),
      role: worker.role || "",
      hours: Number(worker.hours) || 0,
      executed: Number(worker.executed) || 0,
    }));
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

export default function DailyLogForm({
  open,
  onClose,
  onSave,
  masterItem,
  userName,
}) {
  const [form, setForm] = useState(getInitialForm(userName));
  const [workers, setWorkers] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [error, setError] = useState("");

  const { data: allLogs = [] } = useQuery({
    queryKey: ['allDailyLogsForAutocomplete'],
    queryFn: () => api.get('/daily-logs'),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  const { data: allWorkers = [] } = useQuery({
    queryKey: ['allWorkersForAutocomplete'],
    queryFn: () => api.get('/workers'),
    staleTime: 1000 * 60 * 5,
    enabled: open,
  });

  const uniqueSupervisors = Array.from(new Set(allLogs.map(log => log.supervisor).filter(Boolean))).sort();
  const uniqueCapatazNames = Array.from(new Set(allLogs.map(log => log.capataz_name).filter(Boolean))).sort();
  
  const logWorkers = allLogs.flatMap(log => log.crew_workers || []);
  const allWorkerData = [...allWorkers, ...logWorkers];
  
  const uniqueWorkerNames = Array.from(new Set(allWorkerData.map(w => w.name).filter(Boolean))).sort();
  const uniqueWorkerRoles = Array.from(new Set(allWorkerData.map(w => w.role).filter(Boolean))).sort();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setForm({
      ...getInitialForm(userName),
      crew_name: masterItem?.crew_name || "",
    });

    if (
      Array.isArray(masterItem?.crew_members) &&
      masterItem.crew_members.length > 0
    ) {
      setWorkers(
        masterItem.crew_members.map((member) => ({
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
    setShowSignaturePad(false);
    setSignatureImage(null);
    setError("");
  }, [open, masterItem, userName]);

  const updateFormField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

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
      prev.map((worker, idx) =>
        idx === index ? { ...worker, [field]: value } : worker
      )
    );
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const localPhotos = files.map((file) => ({
      url: URL.createObjectURL(file),
      description: "",
      file_name: file.name,
      is_local_preview: true,
    }));

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const fileUrl = data?.file_url || data?.url || data?.data?.file_url || data?.data?.url;

        if (!fileUrl) {
          throw new Error('El servidor no devolvio una URL valida para la foto.');
        }

        setPhotos((prev) => [
          ...prev,
          {
            url: fileUrl,
            description: '',
          },
        ]);
      }
    } catch (error) {
      console.error('Error al subir foto:', error);
      alert('Error al subir foto.');
    } finally {
      event.target.value = '';
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const photo = prev[index];

      if (photo?.is_local_preview && photo?.url) {
        URL.revokeObjectURL(photo.url);
      }

      return prev.filter((_, idx) => idx !== index);
    });
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

    const planned = Number(masterItem.planned_qty || 0);
    const executed = Number(masterItem.executed_qty || 0);
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
      planned,
      onTarget: todayQty >= dailyGoal,
    };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      if (!masterItem) {
        throw new Error("No hay ítem maestro asociado.");
      }

      if (!form.executed_today || Number(form.executed_today) <= 0) {
        throw new Error("Debe ingresar la cantidad ejecutada hoy.");
      }

      const remainingQty = getRemainingQty(masterItem);
      const executedToday = Number(form.executed_today);

      if (remainingQty <= 0) {
        throw new Error("Este ítem ya alcanzó la cantidad planificada.");
      }

      if (executedToday > remainingQty) {
        throw new Error(
          `La cantidad ejecutada hoy no puede superar el pendiente (${remainingQty} ${masterItem.unit || "und"}).`
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
        photos,
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

  const isSaveDisabled =
    !form.executed_today ||
    remainingQty <= 0 ||
    executedTodayQty > remainingQty ||
    saving ||
    (REQUIRE_PHOTO && photos.length === 0) ||
    (REQUIRE_CAPATAZ && !form.capataz_name?.trim()) ||
    (REQUIRE_SIGNATURE && !signatureImage);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reporte Diario</DialogTitle>

          {masterItem && (
            <p className="mt-1 text-xs text-muted-foreground">
              {[
                masterItem.project,
                masterItem.tower,
                masterItem.floor,
                masterItem.activity,
              ]
                .filter(Boolean)
                .join(" — ")}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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
              <AutocompleteInput
                value={form.supervisor}
                onChange={(e) => updateFormField("supervisor", e.target.value)}
                options={uniqueSupervisors}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Cuadrilla</Label>
            <Input
              value={form.crew_name}
              onChange={(e) => updateFormField("crew_name", e.target.value)}
              placeholder="Ej: Cuadrilla Eléctrica A"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                Pendiente:{" "}
                <b>
                  {remainingQty}
                </b>
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
                <p className="text-[10px] text-muted-foreground hidden sm:block">
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
              onChange={(e) =>
                updateFormField("observations", e.target.value)
              }
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
                >
                  <Plus className="h-3 w-3" />
                  Galería
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

            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={photo.url}
                    alt="foto"
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
              <AutocompleteInput
                placeholder="Nombre completo"
                value={form.capataz_name}
                onChange={(e) =>
                  updateFormField("capataz_name", e.target.value)
                }
                options={uniqueCapatazNames}
              />
            </div>

            <div>
              <Label className="text-xs">
                Firma del capataz{" "}
                {!REQUIRE_SIGNATURE && (
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
              Más adelante podemos dejar esta validación como obligatoria para
              producción.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={isSaveDisabled}>
            {saving ? "Guardando..." : "Guardar Reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
