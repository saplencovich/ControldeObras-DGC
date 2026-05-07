import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { exportReportCSV } from '@/utils/exportReport';
import { exportReportPDF } from '@/utils/exportPDF';
import { usePermissions } from '@/lib/PermissionsContext';

const TOWERS = ['Torre A', 'Torre B', 'Torre C'];
const FLOORS = ['Piso 1', 'Piso 2', 'Piso 3', 'Piso 4', 'Piso 5'];
const ACTIVITIES = ['Artefactos', 'Luminarias', 'Canalización', 'Cableado', 'Tableros'];

const RELEASE_STATUSES = [
  { value: 'liberado', label: 'Liberado' },
  { value: 'no_liberado', label: 'No liberado' },
  { value: 'parcial', label: 'Parcial' },
];

export default function FilterBar({
  filters,
  setFilters,
  projects,
  masterItems = [],
  dailyLogs = [],
  sitePhotos = [],
  onNewProject,
  onNewItem,
  onRefresh,
}) {
  const { canCreateProjects } = usePermissions();

  const towerOptions = [
    ...new Set([...TOWERS, ...masterItems.map((item) => item.tower).filter(Boolean)]),
  ];
  const floorOptions = [
    ...new Set([...FLOORS, ...masterItems.map((item) => item.floor).filter(Boolean)]),
  ];
  const activityOptions = [
    ...new Set([...ACTIVITIES, ...masterItems.map((item) => item.activity).filter(Boolean)]),
  ];

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? '' : value,
    }));
  };

  const updateSearch = (event) => {
    setFilters((prev) => ({
      ...prev,
      search: event.target.value,
    }));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Select
          value={filters.project || ''}
          onValueChange={(value) => updateFilter('project', value)}
        >
          <SelectTrigger className="h-9 w-full text-xs text-foreground [&>span]:text-foreground">
            <SelectValue placeholder="Obras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.name}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.tower || ''}
          onValueChange={(value) => updateFilter('tower', value)}
        >
          <SelectTrigger className="h-9 w-full text-xs text-foreground [&>span]:text-foreground">
            <SelectValue placeholder="Torres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {towerOptions.map((tower) => (
              <SelectItem key={tower} value={tower}>
                {tower}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.floor || ''}
          onValueChange={(value) => updateFilter('floor', value)}
        >
          <SelectTrigger className="h-9 w-full text-xs text-foreground [&>span]:text-foreground">
            <SelectValue placeholder="Pisos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {floorOptions.map((floor) => (
              <SelectItem key={floor} value={floor}>
                {floor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.activity || ''}
          onValueChange={(value) => updateFilter('activity', value)}
        >
          <SelectTrigger className="h-9 w-full text-xs text-foreground [&>span]:text-foreground">
            <SelectValue placeholder="Actividades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {activityOptions.map((activity) => (
              <SelectItem key={activity} value={activity}>
                {activity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.release || ''}
          onValueChange={(value) => updateFilter('release', value)}
        >
          <SelectTrigger className="h-9 w-full text-xs text-foreground [&>span]:text-foreground">
            <SelectValue placeholder="Liberación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {RELEASE_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative w-full sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar sector, responsable, restricción..."
            className="h-9 pl-8 text-xs"
            value={filters.search || ''}
            onChange={updateSearch}
          />
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-w-max gap-2 pb-1">
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-primary text-xs"
          onClick={onNewProject}
          disabled={!canCreateProjects}
        >
          <Plus className="h-3 w-3" />
          Nueva Obra
        </Button>

        <Button
          size="sm"
          className="h-8 gap-1.5 bg-primary text-xs"
          onClick={onNewItem}
        >
          <Plus className="h-3 w-3" />
          Nuevo Ítem
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => exportReportPDF(masterItems, dailyLogs, sitePhotos, [])}
        >
          <Download className="h-3 w-3" />
          Exportar PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => exportReportCSV(masterItems, dailyLogs)}
        >
          <FileSpreadsheet className="h-3 w-3" />
          Exportar CSV
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled
        >
          <Upload className="h-3 w-3" />
          Importar CSV
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3 w-3" />
          Recargar
        </Button>
        </div>
      </div>
    </div>
  );
}