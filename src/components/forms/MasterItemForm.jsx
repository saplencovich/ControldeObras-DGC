import React, { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, ClipboardList } from "lucide-react";
import { usePermissions } from "@/lib/PermissionsContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { MultiSelect } from "@/components/ui/multi-select";

const FLOOR_OPTIONS = [
  { label: "Piso 1", value: "Piso 1" },
  { label: "Piso 2", value: "Piso 2" },
  { label: "Piso 3", value: "Piso 3" },
  { label: "Piso 4", value: "Piso 4" },
  { label: "Piso 5", value: "Piso 5" },
  { label: "Piso 6", value: "Piso 6" },
  { label: "Piso 7", value: "Piso 7" },
  { label: "Piso 8", value: "Piso 8" },
  { label: "Piso 9", value: "Piso 9" },
  { label: "Piso 10", value: "Piso 10" },
  { label: "Piso 11", value: "Piso 11" },
  { label: "Piso 12", value: "Piso 12" },
  { label: "Piso 13", value: "Piso 13" },
  { label: "Piso 14", value: "Piso 14" },
  { label: "Piso 15", value: "Piso 15" },
  { label: "Piso 16", value: "Piso 16" },
  { label: "Piso 17", value: "Piso 17" },
  { label: "Piso 18", value: "Piso 18" },
  { label: "Piso 19", value: "Piso 19" },
  { label: "Piso 20", value: "Piso 20" },
  { label: "Piso 21", value: "Piso 21" },
  { label: "Piso 22", value: "Piso 22" },
  { label: "Piso 23", value: "Piso 23" },
  { label: "Piso 24", value: "Piso 24" },
  { label: "Piso 25", value: "Piso 25" },
  { label: "Piso 26", value: "Piso 26" },
  { label: "Piso 27", value: "Piso 27" },
  { label: "Piso 28", value: "Piso 28" },
  { label: "Piso 29", value: "Piso 29" },
  { label: "Piso 30", value: "Piso 30" },
  { label: "Subterráneo 1", value: "Subterráneo 1" },
  { label: "Subterráneo 2", value: "Subterráneo 2" },
  { label: "Subterráneo 3", value: "Subterráneo 3" },
  { label: "Subterráneo 4", value: "Subterráneo 4" },
  { label: "Cubierta", value: "Cubierta" },
  { label: "Exteriores", value: "Exteriores" },
  { label: "Áreas Comunes", value: "Áreas Comunes" },
];

const EMPTY_MEMBER = { name: "", role: "" };

const INITIAL_FORM = {
  project: "",
  tower: "",
  floor: "",
  activity: "",
  start_date: "",
  end_date: "",
  planned_qty: "",
  executed_qty: 0,
  unit: "und",
  crew_name: "",
  status: "pendiente",
  release_status: "no_liberado",
  restrictions: "",
  observations: "",
  floors: [],
};

function getFormFromEditItem(editItem) {
  return {
    project: editItem.project || "",
    tower: editItem.tower || "",
    floor: editItem.floor || "",
    activity: editItem.activity || "",
    start_date: editItem.start_date || "",
    end_date: editItem.end_date || "",
    planned_qty: editItem.planned_qty ?? "",
    executed_qty: editItem.executed_qty ?? 0,
    unit: editItem.unit || "und",
    crew_name: editItem.crew_name || "",
    status: editItem.status || "pendiente",
    release_status: editItem.release_status || "no_liberado",
    restrictions: editItem.restrictions || "",
    observations: editItem.observations || "",
    floors: editItem.floor ? editItem.floor.split(",").map((f) => f.trim()) : [],
  };
}

function getCrewMembersFromEditItem(editItem) {
  if (!editItem?.crew_members) return [{ ...EMPTY_MEMBER }];

  if (Array.isArray(editItem.crew_members)) {
    return editItem.crew_members.length > 0
      ? editItem.crew_members
      : [{ ...EMPTY_MEMBER }];
  }

  try {
    const parsed = JSON.parse(editItem.crew_members);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [{ ...EMPTY_MEMBER }];
  } catch {
    return [{ ...EMPTY_MEMBER }];
  }
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

  const { data: allItems = [] } = useQuery({
    queryKey: ["masterItems"],
    queryFn: () => api.get("/master-items"),
  });

  // Modo local para no bloquear proyectos por permisos mientras desarrollas.
  const isLocalMode = true;

  const filteredProjects =
    isLocalMode || userRole === "admin"
      ? projects
      : projects.filter((project) => hasAccessToProject(project.name));

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [crewMembers, setCrewMembers] = useState([{ ...EMPTY_MEMBER }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setError("");
    setSaving(false);

    if (editItem) {
      setForm(getFormFromEditItem(editItem));
      setCrewMembers(getCrewMembersFromEditItem(editItem));
    } else {
      setForm({ ...INITIAL_FORM });
      setCrewMembers([{ ...EMPTY_MEMBER }]);
    }
  }, [editItem, open]);

  const handleClose = () => {
    if (saving) return;

    setForm({ ...INITIAL_FORM });
    setCrewMembers([{ ...EMPTY_MEMBER }]);
    setError("");
    onClose();
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (error) setError("");
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
    setCrewMembers((prev) => {
      const nextMembers = prev.filter((_, i) => i !== index);
      return nextMembers.length > 0 ? nextMembers : [{ ...EMPTY_MEMBER }];
    });
  };

  const validateForm = () => {
    if (!form.project) {
      return "Debe seleccionar una obra/proyecto.";
    }

    if (!form.activity.trim()) {
      return "Debe ingresar una actividad.";
    }

    if (!form.planned_qty || Number(form.planned_qty) <= 0) {
      return "Debe ingresar una cantidad planificada mayor a 0.";
    }

    if (Number(form.executed_qty || 0) < 0) {
      return "La cantidad ejecutada no puede ser negativa.";
    }

    if (Number(form.executed_qty || 0) > Number(form.planned_qty || 0)) {
      return "La cantidad ejecutada no puede ser mayor a la cantidad planificada.";
    }

    return "";
  };

  const buildData = () => {
    const validMembers = crewMembers
      .filter((member) => member.name.trim())
      .map((member) => ({
        name: member.name.trim(),
        role: member.role.trim(),
      }));

    return {
      ...form,
      project: form.project.trim(),
      tower: form.tower.trim(),
      floor: form.floors && form.floors.length > 0 ? form.floors.join(", ") : "",
      activity: form.activity.trim(),
      planned_qty: Number(form.planned_qty || 0),
      executed_qty: Number(form.executed_qty || 0),
      unit: form.unit.trim() || "und",
      crew_name: form.crew_name.trim(),
      restrictions: form.restrictions.trim(),
      observations: form.observations.trim(),
      crew_size: validMembers.length,
      crew_members: JSON.stringify(validMembers),
    };
  };

  const handleSave = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSave(buildData());
      handleClose();
    } catch (error) {
      console.error("Error al guardar ítem:", error);
      setError(error?.message || "No se pudo guardar el ítem.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndLog = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSaveAndLog(buildData());
      handleClose();
    } catch (error) {
      console.error("Error al guardar ítem y abrir log:", error);
      setError(error?.message || "No se pudo guardar el ítem.");
    } finally {
      setSaving(false);
    }
  };

  const validMemberCount = crewMembers.filter((member) =>
    member.name.trim()
  ).length;

  const isFormInvalid =
    !form.project ||
    !form.activity.trim() ||
    !form.planned_qty ||
    Number(form.planned_qty) <= 0 ||
    saving;

  const uniqueActivities = Array.from(
    new Set(allItems.map((i) => i.activity))
  ).filter(Boolean);

  const uniqueCrewNames = Array.from(
    new Set(allItems.map((i) => i.crew_name))
  ).filter(Boolean);

  const uniqueMemberNames = Array.from(
    new Set(
      allItems.flatMap((i) => {
        try {
          const members = JSON.parse(i.crew_members);
          return Array.isArray(members) ? members.map((m) => m.name) : [];
        } catch {
          return [];
        }
      })
    )
  ).filter(Boolean);

  const selectedProjectObj = projects.find((p) => p.name === form.project);
  const availableFloors = selectedProjectObj?.floors || [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "Editar Ítem" : "Nuevo Ítem Maestro"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {filteredProjects.length === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No hay obras disponibles. Primero crea una obra desde el botón
              “Nueva Obra”.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Proyecto *</Label>
              <Select
                value={form.project}
                onValueChange={(value) => updateFormField("project", value)}
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
              <AutocompleteInput
                value={form.activity}
                onChange={(e) => updateFormField("activity", e.target.value)}
                options={uniqueActivities}
                placeholder="Ej: Artefactos, Luminarias..."
              />
            </div>
          </div>

          {selectedProjectObj?.supervisor && (
            <div>
              <Label className="text-xs">Supervisor de obra</Label>
              <Input
                value={selectedProjectObj.supervisor}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Torre</Label>
              <Input
                value={form.tower}
                onChange={(e) => updateFormField("tower", e.target.value)}
                placeholder="Ej: Torre A, Bloque 1..."
              />
            </div>

            <div>
              <Label className="text-xs">Piso</Label>
              <MultiSelect
                options={FLOOR_OPTIONS}
                selected={form.floors}
                onChange={(val) => updateFormField("floors", val)}
                placeholder="Seleccionar pisos..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Fecha Inicio</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => updateFormField("start_date", e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs">Fecha Término</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => updateFormField("end_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Plan cantidad *</Label>
              <Input
                type="number"
                min="0"
                value={form.planned_qty}
                onChange={(e) =>
                  updateFormField("planned_qty", e.target.value)
                }
              />
            </div>

            <div>
              <Label className="text-xs">Ejecutado</Label>
              <Input
                type="number"
                min="0"
                value={form.executed_qty}
                onChange={(e) =>
                  updateFormField("executed_qty", e.target.value)
                }
              />
            </div>

            <div>
              <Label className="text-xs">Unidad</Label>
              <Input
                value={form.unit}
                onChange={(e) => updateFormField("unit", e.target.value)}
                placeholder="und"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Nombre Cuadrilla</Label>
            <AutocompleteInput
              value={form.crew_name}
              onChange={(e) => updateFormField("crew_name", e.target.value)}
              options={uniqueCrewNames}
              placeholder="Ej: Cuadrilla Reyes"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs">
                Integrantes de la Cuadrilla
                {validMemberCount > 0 && (
                  <span className="ml-1.5 text-muted-foreground">
                    ({validMemberCount} persona
                    {validMemberCount !== 1 ? "s" : ""})
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
                  <AutocompleteInput
                    value={member.name}
                    onChange={(e) =>
                      updateMember(index, "name", e.target.value)
                    }
                    options={uniqueMemberNames}
                    placeholder="Nombre"
                    className="h-8 flex-1 text-xs"
                  />

                  <Input
                    value={member.role}
                    onChange={(e) =>
                      updateMember(index, "role", e.target.value)
                    }
                    placeholder="Cargo"
                    className="h-8 w-32 text-xs"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(index)}
                    disabled={crewMembers.length === 1}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Estado</Label>
              <Select
                value={form.status}
                onValueChange={(value) => updateFormField("status", value)}
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
                onValueChange={(value) =>
                  updateFormField("release_status", value)
                }
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
              onChange={(e) =>
                updateFormField("restrictions", e.target.value)
              }
              className="h-16"
            />
          </div>

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
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={isFormInvalid}>
            {saving ? "Guardando..." : editItem ? "Actualizar" : "Crear Ítem"}
          </Button>

          {!editItem && onSaveAndLog && (
            <Button
              variant="default"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveAndLog}
              disabled={isFormInvalid}
            >
              <ClipboardList className="h-4 w-4" />
              {saving ? "Guardando..." : "Crear y agregar reporte"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}