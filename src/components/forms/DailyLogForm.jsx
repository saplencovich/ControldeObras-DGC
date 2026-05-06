import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInCalendarDays } from 'date-fns';
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
} from 'lucide-react';

import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import SignaturePad from './SignaturePad';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000';

const EMPTY_WORKER = {
  name: '',
  role: '',
  hours: '',
  executed: '',
};

const getInitialForm = (userName = '') => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  supervisor: userName || '',
  crew_name: '',
  executed_today: '',
  hours_worked: '',
  has_restriction: false,
  restriction_detail: '',
  observations: '',
  capataz_name: '',
});

function buildCrewWorkers(workers) {
  return workers
    .filter((worker) => worker.name?.trim())
    .map((worker) => ({
      name: worker.name,
      role: worker.role || '',
      hours: Number(worker.hours) || 0,
      executed: Number(worker.executed) || 0,
    }));
}

function calculateTotalHours(formHoursWorked, crewWorkers) {
  if (formHoursWorked) return Number(formHoursWorked);
  return crewWorkers.reduce((sum, worker) => sum + worker.hours, 0);
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);

  const fileInputRef = useRef(null);

  const { data: projectWorkers = [] } = useQuery({
    queryKey: ['projectWorkers', masterItem?.project],
    enabled: !!masterItem?.project,
    queryFn: () =>
      api.get(`/project-workers?project=${encodeURIComponent(masterItem.project)}`),
  });

  const rosterWorkers = masterItem?.project
    ? projectWorkers.filter((worker) => worker.project === masterItem.project)
    : [];

  useEffect(() => {
    if (!open) return;

    setForm({
      ...getInitialForm(userName),
      crew_name: masterItem?.crew_name || '',
    });

    if (Array.isArray(masterItem?.crew_members) && masterItem.crew_members.length > 0) {
      setWorkers(
        masterItem.crew_members.map((member) => ({
          name: member.name || '',
          role: member.role || '',
          hours: '',
          executed: '',
        }))
      );
    } else {
      setWorkers([]);
    }

    setPhotos([]);
    setUploadingPhoto(false);
    setSaving(false);
    setShowSignaturePad(false);
    setSignatureImage(null);
  }, [open, masterItem, userName]);

  const updateFormField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  const addRosterWorker = (worker) => {
    setWorkers((prev) => [
      ...prev,
      {
        name: worker.name,
        role: worker.role || '',
        hours: '',
        executed: '',
      },
    ]);
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploadingPhoto(true);

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

        setPhotos((prev) => [
          ...prev,
          {
            url: data.file_url,
            description: '',
          },
        ]);
      }
    } catch (error) {
      console.error('Error al subir foto:', error);
      alert('Error al subir foto.');
    } finally {
      setUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const removePhoto = (index) => {
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

    const planned = masterItem.planned_qty || 0;
    const executed = masterItem.executed_qty || 0;
    const remaining = planned - executed;

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

      if (!masterItem) {
        throw new Error('No hay ítem maestro asociado.');
      }

      if (!form.executed_today) {
        throw new Error('Debe ingresar la cantidad ejecutada hoy.');
      }

      if (photos.length === 0) {
        throw new Error('Debe cargar al menos una foto del sitio.');
      }

      if (!form.capataz_name?.trim()) {
        throw new Error('Debe ingresar el nombre del capataz.');
      }

      if (!signatureImage) {
        throw new Error('Debe dibujar la firma del capataz.');
      }

      const crewWorkers = buildCrewWorkers(workers);
      const totalHours = calculateTotalHours(form.hours_worked, crewWorkers);

      if (totalHours > 10) {
        throw new Error('No se pueden registrar más de 10 horas en un día.');
      }

      const weekLogs = await api.get(
        `/daily-logs?project=${encodeURIComponent(masterItem.project)}`
      );

      const weeklyHours =
        weekLogs.reduce((sum, log) => sum + (Number(log.hours_worked) || 0), 0) +
        Number(totalHours);

      if (weeklyHours > 44) {
        throw new Error(
          `Supera el límite semanal: ${weeklyHours}h registradas de máximo 44h.`
        );
      }

      const log = await onSave({
        ...form,
        crew_name: form.crew_name || masterItem?.crew_name || '',
        executed_today: Number(form.executed_today),
        hours_worked: totalHours,
        crew_workers: crewWorkers,
        capataz_signature: signatureImage,
        master_item_id: masterItem.id,
        project: masterItem.project,
        tower: masterItem.tower,
        floor: masterItem.floor,
        activity: masterItem.activity,
      });

      if (log?.id) {
        for (const photo of photos) {
          await api.post('/site-photos', {
            daily_log_id: log.id,
            master_item_id: masterItem.id,
            file_url: photo.url,
            description: photo.description || '',
            label: 'reporte_diario',
            date: form.date,
          });
        }
      }

      onClose();
    } catch (error) {
      console.error('Error al guardar reporte:', error);
      alert(error.message || 'Error al guardar reporte.');
    } finally {
      setSaving(false);
    }
  };

  const goalInfo = getDailyGoalInfo();

  const availableRosterWorkers = rosterWorkers.filter(
    (rosterWorker) => !workers.some((worker) => worker.name === rosterWorker.name)
  );

  const isSaveDisabled =
    !form.executed_today ||
    !form.capataz_name?.trim() ||
    !signatureImage ||
    photos.length === 0 ||
    saving ||
    uploadingPhoto;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reporte Diario</DialogTitle>

          {masterItem && (
            <p className="mt-1 text-xs text-muted-foreground">
              {[masterItem.project, masterItem.tower, masterItem.floor, masterItem.activity]
                .filter(Boolean)
                .join(' — ')}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => updateFormField('date', e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Supervisor</Label>
              <Input
                value={form.supervisor}
                onChange={(e) => updateFormField('supervisor', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Cuadrilla</Label>
            <Input
              value={form.crew_name}
              onChange={(e) => updateFormField('crew_name', e.target.value)}
              placeholder="Ej: Cuadrilla Eléctrica A"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ejecutado hoy *</Label>
              <Input
                type="number"
                value={form.executed_today}
                onChange={(e) => updateFormField('executed_today', e.target.value)}
              />

              {goalInfo && (
                <div
                  className={`mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                    goalInfo.onTarget
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {goalInfo.onTarget ? (
                    <>
                      <TrendingUp className="h-3 w-3" />
                      <span>
                        Dentro de meta. Meta: {goalInfo.dailyGoal}{' '}
                        {masterItem?.unit || 'und'}/día
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3" />
                      <span>
                        Bajo meta. Meta: {goalInfo.dailyGoal}{' '}
                        {masterItem?.unit || 'und'}/día
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Horas trabajadas *</Label>
              <Input
                type="number"
                step="0.5"
                placeholder="Se calcula del personal si se deja vacío"
                value={form.hours_worked}
                onChange={(e) => updateFormField('hours_worked', e.target.value)}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Máximo: 10h/día • 44h/semana. Productividad: ejecutado ÷ horas.
              </p>
            </div>
          </div>

          {masterItem && (
            <div className="flex flex-wrap gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span>
                <Target className="mr-0.5 inline h-3 w-3" />
                Total:{' '}
                <b>
                  {masterItem.planned_qty} {masterItem.unit || 'und'}
                </b>
              </span>
              <span>
                Ejecutado acum.: <b>{masterItem.executed_qty || 0}</b>
              </span>
              <span>
                Pendiente:{' '}
                <b>
                  {Math.max(
                    (masterItem.planned_qty || 0) - (masterItem.executed_qty || 0),
                    0
                  )}
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

            {availableRosterWorkers.length > 0 && (
              <div className="mb-2 rounded-lg bg-muted/40 p-2">
                <p className="mb-1.5 text-[10px] text-muted-foreground">
                  Personal del padrón:
                </p>

                <div className="flex flex-wrap gap-1">
                  {availableRosterWorkers.map((worker) => (
                    <button
                      key={worker.id}
                      type="button"
                      className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] text-primary transition-colors hover:bg-primary/20"
                      onClick={() => addRosterWorker(worker)}
                    >
                      + {worker.name} {worker.role ? `(${worker.role})` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {workers.length === 0 && (
              <p className="py-2 text-xs italic text-muted-foreground">
                Sin personal registrado. Selecciona del padrón o haz clic en Agregar.
              </p>
            )}

            <div className="space-y-2">
              {workers.map((worker, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_80px_80px_32px] items-center gap-2"
                >
                  <Input
                    placeholder="Nombre"
                    className="h-8 text-xs"
                    value={worker.name}
                    onChange={(e) => updateWorker(index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="Cargo"
                    className="h-8 text-xs"
                    value={worker.role}
                    onChange={(e) => updateWorker(index, 'role', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Horas"
                    className="h-8 text-xs"
                    value={worker.hours}
                    onChange={(e) => updateWorker(index, 'hours', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Ejec."
                    className="h-8 text-xs"
                    value={worker.executed}
                    onChange={(e) => updateWorker(index, 'executed', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeWorker(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {workers.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Columnas: Nombre / Cargo / Horas / Ejecutado
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.has_restriction}
              onCheckedChange={(value) => updateFormField('has_restriction', value)}
            />
            <Label className="text-xs">¿Tiene restricción?</Label>
          </div>

          {form.has_restriction && (
            <div>
              <Label className="text-xs">Detalle de restricción</Label>
              <Textarea
                value={form.restriction_detail}
                onChange={(e) =>
                  updateFormField('restriction_detail', e.target.value)
                }
                className="h-16"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Observaciones</Label>
            <Textarea
              value={form.observations}
              onChange={(e) => updateFormField('observations', e.target.value)}
              className="h-16"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Camera className="h-3.5 w-3.5" />
                Fotos del reporte <span className="text-destructive">*</span>
              </Label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Plus className="h-3 w-3" />
                {uploadingPhoto ? 'Subiendo...' : 'Agregar foto'}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {photos.length === 0 && (
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
              Validación del Capataz <span className="text-destructive">*</span>
            </Label>

            <div>
              <Label className="text-xs">Nombre del capataz</Label>
              <Input
                placeholder="Nombre completo"
                value={form.capataz_name}
                onChange={(e) => updateFormField('capataz_name', e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">
                Firma del capataz <span className="text-destructive">*</span>
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
              Esto certifica que el capataz ha validado la información del reporte.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={isSaveDisabled}>
            {saving ? 'Guardando...' : 'Guardar Reporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}