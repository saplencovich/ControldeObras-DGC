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
import { usePermissions } from "@/lib/PermissionsContext";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { AlertTriangle } from "lucide-react";
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

export default function ProjectForm({ open, onClose, onSave }) {
  const { canCreateProjects } = usePermissions();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects"),
  });

  // Modo local para poder probar sin depender todavía de permisos reales.
  const isLocalMode = true;

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setSaving(false);
    }
  }, [open]);

  const updateFormField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleClose = () => {
    if (saving) return;

    setForm({ ...INITIAL_FORM });
    setError("");
    onClose();
  };

  const handleSave = async () => {
    const name = form.name.trim();

    if (!name) {
      setError("El nombre de la obra es obligatorio.");
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
        supervisor: form.supervisor.trim(),
        capataz: form.capataz.trim(),
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
      console.error("Error al crear obra:", error);
      setError(error?.message || "No se pudo crear la obra.");
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
            <Button variant="outline" onClick={handleClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const isFormInvalid = !form.name.trim() || saving;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Obra</DialogTitle>
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
              <Input
                value={form.supervisor}
                onChange={(e) => updateFormField("supervisor", e.target.value)}
                placeholder="Nombre del supervisor"
              />
            </div>

            <div>
              <Label className="text-xs">Capataz</Label>
              <Input
                value={form.capataz}
                onChange={(e) => updateFormField("capataz", e.target.value)}
                placeholder="Nombre del capataz"
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
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>

          <Button onClick={handleSave} disabled={isFormInvalid}>
            {saving ? "Guardando..." : "Crear Obra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}