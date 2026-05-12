const DEFAULT_FLOORS = ["Piso 1", "Piso 2", "Piso 3", "Piso 4", "Piso 5"];

export function getFloorList(floor) {
  return String(floor || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getFloorNumber(floor) {
  const match = String(floor || "").match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

function sortFloors(a, b) {
  const numberA = getFloorNumber(a);
  const numberB = getFloorNumber(b);

  if (numberA !== null && numberB !== null && numberA !== numberB) {
    return numberA - numberB;
  }

  return String(a).localeCompare(String(b), "es", { numeric: true });
}

export function getFloorOptions(items = [], defaults = DEFAULT_FLOORS) {
  const floors = items.flatMap((item) => getFloorList(item.floor));
  return [...new Set([...defaults, ...floors])].sort(sortFloors);
}

export function itemHasFloor(itemFloor, selectedFloor) {
  if (!selectedFloor) return true;
  return getFloorList(itemFloor).includes(selectedFloor);
}
