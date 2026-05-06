import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function MultiSelect({ options, selected, onChange, placeholder = "Seleccionar" }) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value) => {
    const newSelected = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9"
        >
          <span className="text-sm text-muted-foreground truncate">
            {selected.length > 0
              ? `${selected.length} seleccionada(s)`
              : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="max-h-60 overflow-auto p-2">
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer"
              onClick={() => handleToggle(option.value)}
            >
              <Checkbox checked={selected.includes(option.value)} />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}