import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, ClipboardList } from 'lucide-react';
import { usePermissions } from '@/lib/PermissionsContext';

const EMPTY_MEMBER = { name: '', role: '' };

const INITIAL_FORM = {
  project: '',
  tower: '',
  floor: '',
  activity: '',
  start_date: '',
  end_date: '',
  planned_qty: '',
  executed_qty: 0,
  unit: 'und',
  crew_name: '',
  status: 'pendiente',
  release_status: 'no_liberado',
  restrictions: '',
  observations: '',
};

function getFormFromEditItem(editItem) {
  return {
    project: editItem.project || '',
    tower: editItem.tower || '',
    floor: editItem.floor || '',
    activity: editItem.activity || '',
    start_date: editItem.start_date || '',
    end_date: editItem.end_date || '',
    planned_qty: editItem.planned_qty || '',
    executed_qty: editItem.executed_qty || 0,
    unit: editItem.unit || 'und',
    crew_name: editItem.crew_name || '',
    status: editItem.status || 'pendiente',
    release_status: editItem.release_status || 'no_liberado',
    restrictions: editItem.restrictions || '',
    observations: editItem.observations || '',
  };
}

export default function MasterItemForm({
  open,
  onClose,
  onSave,
  onSaveAndLog,
  editItem,
  projects = [],
}) {
  const { hasAccessToProject, userRole } = usePermissions();

  const filteredProjects =
    userRole === 'admin'
      ? projects
      : projects.filter((project) => hasAccessToProject(project.name));

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [crewMembers, setCrewMembers] = useState([{ ...EMPTY_MEMBER }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editItem) {
      setForm(getFormFromEditItem(editItem));

      if (Array.isArray(editItem.crew_members) && editItem.crew_members.length > 0) {
        setCrewMembers(editItem.crew_members);
      } else {
        setCrewMembers([{ ...EMPTY_MEMBER }]);
      }
    } else {
      setForm({ ...INITIAL_FORM });
      setCrewMembers([{ ...EMPTY_MEMBER }]);
    }
  }, [editItem, open]);

  const updateFormField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateMember = (index, field, value) => {
    setCrewMembers((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    );
  };

  const addMember = () => {
    setCrewMembers((prev) => [...prev, { ...EMPTY_MEMBER }]);
  };

  const removeMember = (index) => {
    setCrewMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const buildData = () => {
    const validMembers = crewMembers.filter((member) => member.name.trim());

    return {
      ...form,
      planned_qty: Number(form.planned_qty),
      executed_qty: Number(form.executed_qty),
      crew_size: validMembers.length,
      crew_members: validMembers,
    };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(buildData());
      onClose();
    } catch (error) {
      console.error('Error al guardar ítem:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndLog = async () => {
    try {
      setSaving(true);
      await onSaveAndLog(buildData());
      onClose();
    } catch (error) {
      console.error('Error al guardar ítem y abrir log:', error);
    } finally {
      setSaving(false);
    }
  };

  const validMemberCount = crewMembers.filter((member) =>
    member.name.trim()
  ).length;

  const isFormInvalid =
    !form.project || !form.activity || !form.planned_qty || saving;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem ? 'Editar Ítem' : 'Nuevo Ítem Maestro'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Proyecto *</Label>
              <Select
                value={form.project}
                onValueChange={(value) => updateFormField('project', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Actividad *</Label>
              <Input
                value={form.activity}
                onChange={(e) => updateFormField('activity', e.target.value)}
                placeholder="Ej: Artefactos, Luminarias..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Torre</Label>
              <Input
                value={form.tower}
                onChange={(e) => updateFormField('tower', e.target.value)}
                placeholder="Ej: Torre A, Bloque 1..."
              />
            </div>

            <div>
              <Label className="text-xs">Piso</Label>
              <Input
                value={form.floor}
                onChange={(e) => updateFormField('floor', e.target.value)}
                placeholder="Ej: Piso 1, Subterráneo..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fecha Inicio</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => updateFormField('start_date', e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Fecha Término</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => updateFormField('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Plan (cantidad) *</Label>
              <Input
                type="number"
                value={form.planned_qty}
                onChange={(e) => updateFormField('planned_qty', e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Ejecutado</Label>
              <Input
                type="number"
                value={form.executed_qty}
                onChange={(e) => updateFormField('executed_qty', e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Unidad</Label>
              <Input
                value={form.unit}
                onChange={(e) => updateFormField('unit', e.target.value)}
                placeholder="und"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Nombre Cuadrilla</Label>
            <Input
              value={form.crew_name}
              onChange={(e) => updateFormField('crew_name', e.target.value)}
              placeholder="Ej: Cuadrilla Reyes"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs">
                Integrantes de la Cuadrilla
                {validMemberCount > 0 && (
                  <span className="ml-1.5 text-muted-foreground">
                    ({validMemberCount} persona{validMemberCount !== 1 ? 's' : ''})
                  </span>
                )}
              </Label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={addMember}
              >
                <Plus className="h-3 w-3" />
                Agregar
              </Button>
            </div>

            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {crewMembers.map((member, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={member.name}
                    onChange={(e) => updateMember(index, 'name', e.target.value)}
                    placeholder="Nombre"
                    className="h-8 flex-1 text-xs"
                  />

                  <Input
                    value={member.role}
                    onChange={(e) => updateMember(index, 'role', e.target.value)}
                    placeholder="Cargo"
                    className="h-8 w-32 text-xs"
                  />

                  {crewMembers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Estado</Label>
              <Select
                value={form.status}
                onValueChange={(value) => updateFormField('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_ejecucion">En ejecución</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Liberación</Label>
              <Select
                value={form.release_status}
                onValueChange={(value) => updateFormField('release_status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liberado">Liberado</SelectItem>
                  <SelectItem value="no_liberado">No liberado</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Restricciones</Label>
            <Textarea
              value={form.restrictions}
              onChange={(e) => updateFormField('restrictions', e.target.value)}
              className="h-16"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={isFormInvalid}>
            {saving ? 'Guardando...' : editItem ? 'Actualizar' : 'Crear Ítem'}
          </Button>

          {!editItem && onSaveAndLog && (
            <Button
              variant="default"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveAndLog}
              disabled={isFormInvalid}
            >
              <ClipboardList className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Crear y agregar reporte'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}