import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Trash2, FileSpreadsheet, Upload, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/lib/PermissionsContext';
import { api } from '@/lib/api';

export default function Workers() {
  const queryClient = useQueryClient();
  const { hasAccessToProject, userRole } = usePermissions();
  const fileInputRef = useRef(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState('all');
  const [form, setForm] = useState({ project: '', name: '', role: '' });

  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importProject, setImportProject] = useState(''); // ← obra seleccionada en modal

  const { data: projectWorkers = [], isLoading } = useQuery({
    queryKey: ['projectWorkers'],
    queryFn: () => api.get('/project-workers'),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['dailyLogs'],
    queryFn: () => api.get('/daily-logs'),
  });

  const filteredProjects =
    userRole === 'admin'
      ? projects
      : projects.filter((p) => hasAccessToProject(p.name));

  const createWorker = useMutation({
    mutationFn: (data) => api.post('/project-workers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWorkers'] });
      setShowForm(false);
      setForm({ project: '', name: '', role: '' });
    },
  });

  const deleteWorker = useMutation({
    mutationFn: (id) => api.delete(`/project-workers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWorkers'] });
    },
  });

  const workerProductivity = {};
  dailyLogs.forEach((log) => {
    log.crew_workers?.forEach((w) => {
      if (!w.name) return;
      if (!workerProductivity[w.name]) {
        workerProductivity[w.name] = { hours: 0, executed: 0, days: 0 };
      }
      workerProductivity[w.name].hours += w.hours || 0;
      workerProductivity[w.name].executed += w.executed || 0;
      workerProductivity[w.name].days += 1;
    });
  });

  const canSeeWorker = (w) => userRole === 'admin' || hasAccessToProject(w.project);

  const filteredWorkers =
    selectedProject === 'all'
      ? projectWorkers.filter(canSeeWorker)
      : projectWorkers.filter((w) => w.project === selectedProject && canSeeWorker(w));

  const projectNames = [
    ...new Set(projectWorkers.map((w) => w.project).filter(Boolean)),
  ];
  const allProjects = [
    ...new Set([...filteredProjects.map((p) => p.name), ...projectNames]),
  ];

  // Abre el picker siempre, sin requerir obra previa
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const parsed = rows
          .map((row) => ({
            name: String(row['Nombre'] || row['nombre'] || row['name'] || row['NOMBRE'] || '').trim(),
            role: String(row['Cargo'] || row['cargo'] || row['role'] || row['CARGO'] || '').trim(),
          }))
          .filter((r) => r.name);

        if (parsed.length === 0) {
          setImportError('No se encontraron filas válidas. Asegúrate de que el archivo tenga columnas "Nombre" y "Cargo".');
          setImportRows([]);
        } else {
          setImportError('');
          setImportRows(parsed);
        }

        // Pre-cargar obra si ya hay una seleccionada en el filtro
        setImportProject(selectedProject !== 'all' ? selectedProject : '');
        setShowImportPreview(true);
      } catch (err) {
        setImportError('Error al leer el archivo: ' + err.message);
        setImportRows([]);
        setImportProject('');
        setShowImportPreview(true);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      for (const row of importRows) {
        await api.post('/project-workers', {
          project: importProject, // ← usa la obra del modal
          name: row.name,
          role: row.role,
          active: true,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['projectWorkers'] });
      setShowImportPreview(false);
      setImportRows([]);
      setImportProject('');
    } catch (err) {
      setImportError('Error al importar: ' + (err.message || 'Error desconocido'));
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImport = () => {
    setShowImportPreview(false);
    setImportRows([]);
    setImportError('');
    setImportProject('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          Personal y Productividad
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="Filtrar por obra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las obras</SelectItem>
              {allProjects.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleImportClick}
          >
            <FileSpreadsheet className="w-3 h-3" />
            Importar Excel/CSV
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              setForm({
                project: selectedProject !== 'all' ? selectedProject : '',
                name: '',
                role: '',
              });
              setShowForm(true);
            }}
          >
            <Plus className="w-3 h-3" />
            Agregar Persona
          </Button>
        </div>
      </div>

      <Tabs defaultValue="roster">
        <TabsList className="h-8">
          <TabsTrigger value="roster" className="text-xs">Padrón de Personal</TabsTrigger>
          <TabsTrigger value="productivity" className="text-xs">Productividad Individual</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Personal registrado{' '}
                {selectedProject !== 'all' ? `— ${selectedProject}` : ''}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredWorkers.length})
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Nombre completo</TableHead>
                      <TableHead className="text-xs">Cargo</TableHead>
                      <TableHead className="text-xs">Obra</TableHead>
                      <TableHead className="text-xs text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredWorkers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-12">
                          Sin personal registrado.
                        </TableCell>
                      </TableRow>
                    )}

                    {filteredWorkers.map((w) => (
                      <TableRow key={w.id} className="hover:bg-muted/30 text-xs">
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell>{w.role || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{w.project}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600"
                            onClick={() =>
                              window.confirm(`¿Eliminar a ${w.name}?`) &&
                              deleteWorker.mutate(w.id)
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Productividad Individual (desde reportes diarios)
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs text-right">Jornadas</TableHead>
                      <TableHead className="text-xs text-right">Horas Total</TableHead>
                      <TableHead className="text-xs text-right">Ejecutado Total</TableHead>
                      <TableHead className="text-xs text-right">Rendimiento (ejec/h)</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {Object.keys(workerProductivity).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-12">
                          Sin datos. Registra personal en los reportes diarios para ver productividad.
                        </TableCell>
                      </TableRow>
                    )}

                    {Object.entries(workerProductivity)
                      .sort((a, b) => b[1].hours - a[1].hours)
                      .map(([name, p]) => {
                        const rend = p.hours > 0 ? (p.executed / p.hours).toFixed(2) : '—';
                        return (
                          <TableRow key={name} className="hover:bg-muted/30 text-xs">
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell className="text-right">{p.days}</TableCell>
                            <TableCell className="text-right">{p.hours}h</TableCell>
                            <TableCell className="text-right font-mono font-medium">{p.executed}</TableCell>
                            <TableCell className="text-right font-mono">{rend}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal agregar persona manualmente */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Persona al Padrón</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Obra *</Label>
              <Select value={form.project} onValueChange={(v) => setForm({ ...form, project: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent>
                  {allProjects.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Nombre completo *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej: Juan Pérez González"
              />
            </div>

            <div>
              <Label className="text-xs">Cargo</Label>
              <Input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Ej: Electricista"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={() => createWorker.mutate({ ...form, active: true })}
              disabled={!form.project || !form.name || createWorker.isPending}
            >
              {createWorker.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal previsualización importación */}
      <Dialog open={showImportPreview} onOpenChange={handleCloseImport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importar personal
            </DialogTitle>
          </DialogHeader>

          {importError ? (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          ) : (
            <>
              {/* Selector de obra dentro del modal */}
              <div>
                <Label className="text-xs">Obra destino *</Label>
                <Select value={importProject} onValueChange={setImportProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar obra" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProjects.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                Se importarán <strong>{importRows.length} personas</strong>.
                {importProject && <> Obra destino: <strong>{importProject}</strong>.</>}
              </p>

              <div className="max-h-64 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs">Cargo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.map((row, i) => (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.role || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseImport} disabled={importing}>
              Cancelar
            </Button>
            {!importError && (
              <Button
                onClick={handleConfirmImport}
                disabled={importing || !importProject}
              >
                {importing ? 'Importando...' : `Importar ${importRows.length} personas`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}