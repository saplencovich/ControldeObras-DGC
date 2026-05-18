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
import { usePermissions } from "@/lib/PermissionsContext";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const INITIAL_FORM = {
  name: "",
  address: "",
  client: "",
  supervisor: "",
  capataz: "",
  description: "",
  status: "activa",
  start_date: "",
  end_date: "",
};

function normalizeProjectName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export default function ProjectForm({ open, onClose, onSave, onDelete, editProject = null }) {
  const { canCreateProjects } = usePermissions();
  const isEditing = Boolean(editProject);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects"),
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

  const isLocalMode = true;

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setSaving(false);
      setForm({ ...INITIAL_FORM });
      return;
    }

    if (editProject) {
      setForm({
        name: editProject.name || "",
        address: editProject.address || editProject.location || "",
        client: editProject.client || "",
        supervisor: editProject.supervisor || "",
        capataz: editProject.capataz || "",
        description: editProject.description || "",
        status: editProject.status || "activa",
        start_date: editProject.start_date || "",
        end_date: editProject.end_date || "",
      });
    } else {
      setForm({ ...INITIAL_FORM });
    }
  }, [open, editProject]);

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleClose = () => {
    if (saving) return;
    setForm({ ...INITIAL_FORM });
    setError("");
    onClose();
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const duplicateProject = projects.find(
      (project) =>
        normalizeProjectName(project.name) === normalizeProjectName(name) &&
        Number(project.id) !== Number(editProject?.id)
    );

    if (!name) {
      setError("El nombre de la obra es obligatorio.");
      return;
    }

    if (duplicateProject) {
      setError(`Ya existe una obra con el nombre "${duplicateProject.name}".`);
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...form,
        name,
        address: form.address.trim(),
        client: form.client.trim(),
        supervisor: form.supervisor,
        capataz: form.capataz,
        description:
          form.description.trim() ||
          [
            form.supervisor ? `Supervisor: ${form.supervisor}` : "",
            form.capataz ? `Capataz: ${form.capataz}` : "",
          ]
            .filter(Boolean)
            .join(" | "),
        status: form.status || "activa",
      };

      await onSave(payload);
      setForm({ ...INITIAL_FORM });
      onClose();
    } catch (error) {
      console.error("Error al guardar obra:", error);
      setError(error?.message || "No se pudo guardar la obra.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editProject || !onDelete) return;

    const confirmed = window.confirm(
      `¿Eliminar la obra "${editProject.name}"?\nEsta acción también eliminará sus ítems, reportes diarios y fotos.`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      await onDelete(editProject);
      setForm({ ...INITIAL_FORM });
      onClose();
    } catch (error) {
      console.error("Error al eliminar obra:", error);
      setError(error?.message || "No se pudo eliminar la obra.");
    } finally {
      setSaving(false);
    }
  };

  if (!isLocalMode && !canCreateProjects) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Permiso Insuficiente
            </DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground">
              Solo supervisores y administradores pueden crear nuevas obras.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const duplicateProject = form.name.trim()
    ? projects.find(
        (project) =>
          normalizeProjectName(project.name) === normalizeProjectName(form.name) &&
          Number(project.id) !== Number(editProject?.id)
      )
    : null;
  const isFormInvalid = !form.name.trim() || Boolean(duplicateProject) || saving;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Obra" : "Nueva Obra"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <Label className="text-xs">Nombre de la Obra *</Label>
            <AutocompleteInput
              value={form.name}
              onChange={(e) => updateFormField("name", e.target.value)}
              options={projects.map((p) => p.name)}
              placeholder="Ej: Edificio Centro"
            />
            {duplicateProject && (
              <p className="mt-1 text-xs text-red-600">
                Ya existe una obra con este nombre. Selecciona la existente o usa otro nombre.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Ubicación</Label>
            <Input
              value={form.address}
              onChange={(e) => updateFormField("address", e.target.value)}
              placeholder="Ej: Santiago Centro"
            />
          </div>

          <div>
            <Label className="text-xs">Cliente</Label>
            <Input
              value={form.client}
              onChange={(e) => updateFormField("client", e.target.value)}
              placeholder="Ej: Constructora Demo"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Supervisor</Label>
              <Select
                value={form.supervisor}
                onValueChange={(v) => updateFormField("supervisor", v)}
              >
                <SelectTrigger>
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
            </div>

            <div>
              <Label className="text-xs">Capataz</Label>
              <Select
                value={form.capataz}
                onValueChange={(v) => updateFormField("capataz", v)}
              >
                <SelectTrigger>
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

          <div>
            <Label className="text-xs">Descripción</Label>
            <Input
              value={form.description}
              onChange={(e) => updateFormField("description", e.target.value)}
              placeholder="Descripción breve de la obra"
            />
          </div>
        </div>

        <DialogFooter>
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="gap-2 sm:mr-auto"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isFormInvalid}>
            {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Obra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
