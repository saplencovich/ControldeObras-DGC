import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/lib/PermissionsContext';
import { AlertTriangle } from 'lucide-react';

const INITIAL_FORM = {
  name: '',
  location: '',
  client: '',
  supervisor: '',
  capataz: '',
  status: 'activo',
  start_date: '',
  end_date: '',
};

export default function ProjectForm({ open, onClose, onSave }) {
  const { canCreateProjects } = usePermissions();

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);

  const updateFormField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(form);
      setForm({ ...INITIAL_FORM });
      onClose();
    } catch (error) {
      console.error('Error al crear obra:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!canCreateProjects) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
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
        </DialogContent>
      </Dialog>
    );
  }

  const isFormInvalid = !form.name || saving;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Obra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Nombre de la Obra *</Label>
            <Input
              value={form.name}
              onChange={(e) => updateFormField('name', e.target.value)}
              placeholder="Ej: El Sauce"
            />
          </div>

          <div>
            <Label className="text-xs">Ubicación</Label>
            <Input
              value={form.location}
              onChange={(e) => updateFormField('location', e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Cliente</Label>
            <Input
              value={form.client}
              onChange={(e) => updateFormField('client', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Supervisor</Label>
              <Input
                value={form.supervisor}
                onChange={(e) => updateFormField('supervisor', e.target.value)}
                placeholder="Nombre del supervisor"
              />
            </div>

            <div>
              <Label className="text-xs">Capataz</Label>
              <Input
                value={form.capataz}
                onChange={(e) => updateFormField('capataz', e.target.value)}
                placeholder="Nombre del capataz"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isFormInvalid}>
            {saving ? 'Guardando...' : 'Crear Obra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}