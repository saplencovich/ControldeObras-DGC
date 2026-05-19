import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Plus,
  Download,
  FileSpreadsheet,
  Pencil,
  Check,
  ChevronDown,
} from 'lucide-react';
import { exportReportExcel } from '@/utils/exportExcel';
import { exportReportPDF } from '@/utils/exportPDF';
import { usePermissions } from '@/lib/PermissionsContext';
import { getFloorOptions } from '@/utils/floors';

const TOWERS = ['Torre A', 'Torre B', 'Torre C'];
const ACTIVITIES = ['Artefactos', 'Luminarias', 'Canalizacion', 'Cableado', 'Tableros'];

const RELEASE_STATUSES = [
  { value: 'liberado', label: 'Liberado' },
  { value: 'no_liberado', label: 'No liberado' },
  { value: 'parcial', label: 'Parcial' },
];

function FilterPill({ label, value, placeholder = 'Todas', options, onChange }) {
  const active = Boolean(value);
  const selectedOption = options.find((option) => {
    const optionValue = typeof option === 'string' ? option : option.value;
    return optionValue === value;
  });
  const displayValue = selectedOption
    ? typeof selectedOption === 'string'
      ? selectedOption
      : selectedOption.label
    : value;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={[
            'h-10 justify-between gap-3 rounded-lg border-slate-200 bg-white px-3 text-left text-xs shadow-sm',
            active ? 'border-primary/30 bg-primary/5 text-primary' : 'text-slate-700',
          ].join(' ')}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
              {label}
            </span>
            <span className="max-w-[160px] truncate font-semibold">
              {displayValue || placeholder}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[min(92vw,360px)] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground">Selecciona una opcion</p>
          </div>
          {active && (
            <Badge variant="secondary" className="bg-primary/10 text-[11px] text-primary">
              Activo
            </Badge>
          )}
        </div>

        <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
          <Button
            type="button"
            variant={!value ? 'default' : 'outline'}
            size="sm"
            className="h-8 justify-start rounded-md px-2 text-xs"
            onClick={() => onChange('all')}
          >
            {!value && <Check className="mr-1.5 h-3 w-3" />}
            {placeholder}
          </Button>

          {options.map((option) => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            const selected = value === optionValue;

            return (
              <Button
                key={optionValue}
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="sm"
                className="h-8 justify-start rounded-md px-2 text-xs"
                title={optionLabel}
                onClick={() => onChange(optionValue)}
              >
                {selected && <Check className="mr-1.5 h-3 w-3" />}
                <span className="truncate">{optionLabel}</span>
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function FilterBar({
  filters,
  setFilters,
  projects,
  masterItems = [],
  filterOptionItems = masterItems,
  dailyLogs = [],
  sitePhotos = [],
  pdfMasterItems = masterItems,
  pdfDailyLogs = dailyLogs,
  pdfSitePhotos = sitePhotos,
  onNewProject,
  onEditProject,
  onNewItem,
  onRefresh,
  userName = '',
  showPdfExport = true,
}) {
  const { canCreateProjects, isAdmin } = usePermissions();

  // Use the provided `filterOptionItems` (unfiltered source) to build dropdown options
  const sourceItems = (filterOptionItems && filterOptionItems.length) ? filterOptionItems : masterItems;

  const normalizeKey = (v) =>
    String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const uniqueList = (arr) => {
    const seen = new Set();
    const out = [];
    for (const v of arr) {
      const key = normalizeKey(v);
      if (!key) continue;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(String(v || "").trim());
      }
    }
    return out;
  };

  const towerOptions = uniqueList([
    ...TOWERS,
    ...sourceItems.map((item) => item.tower),
  ]);
  const floorOptions = getFloorOptions(filterOptionItems);
  const activityOptions = uniqueList([
    ...ACTIVITIES,
    ...sourceItems.map((item) => item.activity),
  ]);

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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <FilterPill
          label="Obra"
          value={filters.project}
          options={projects.map((project) => project.name)}
          onChange={(value) => updateFilter('project', value)}
        />

        <FilterPill
          label="Torre"
          value={filters.tower}
          options={towerOptions}
          onChange={(value) => updateFilter('tower', value)}
        />

        <FilterPill
          label="Piso"
          value={filters.floor}
          placeholder="Todos"
          options={floorOptions}
          onChange={(value) => updateFilter('floor', value)}
        />

        <FilterPill
          label="Actividad"
          value={filters.activity}
          options={activityOptions}
          onChange={(value) => updateFilter('activity', value)}
        />

        <FilterPill
          label="Liberacion"
          value={filters.release}
          options={RELEASE_STATUSES}
          onChange={(value) => updateFilter('release', value)}
        />
      </div>

      <div className="relative w-full">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar sector, responsable, restriccion..."
          className="h-9 pl-8 text-xs"
          value={filters.search || ''}
          onChange={updateSearch}
        />
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

          {isAdmin && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  disabled={projects.length === 0}
                >
                  <Pencil className="h-3 w-3" />
                  Editar Obra
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(92vw,360px)] p-3">
                <div className="mb-3">
                  <p className="text-xs font-semibold text-foreground">Editar obra</p>
                  <p className="text-[11px] text-muted-foreground">
                    Elige la obra que quieres modificar
                  </p>
                </div>
                <div className="grid max-h-64 gap-1.5 overflow-y-auto pr-1">
                  {projects.map((project) => (
                    <Button
                      key={project.id}
                      type="button"
                      variant={filters.project === project.name ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 justify-start rounded-md px-2 text-xs"
                      title={project.name}
                      onClick={() => onEditProject(project)}
                    >
                      <span className="truncate">{project.name}</span>
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            size="sm"
            className="h-8 gap-1.5 bg-primary text-xs"
            onClick={onNewItem}
          >
            <Plus className="h-3 w-3" />
            Nuevo Item
          </Button>

          {showPdfExport && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() =>
                exportReportPDF(pdfMasterItems, pdfDailyLogs, pdfSitePhotos, [], projects, userName, {
                  showIncludedProjects: false,
                  includeDailyReports: false,
                  includePhotos: false,
                })
              }
            >
              <Download className="h-3 w-3" />
              Exportar PDF
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => exportReportExcel(masterItems, dailyLogs)}
          >
            <FileSpreadsheet className="h-3 w-3" />
            Exportar Excel
          </Button>

        </div>
      </div>
    </div>
  );
}
