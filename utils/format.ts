export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatMm(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} mm`;
}

export function formatCoords(latitude: number, longitude: number): string {
  const northSouth = latitude >= 0 ? "N" : "S";
  const eastWest = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(2)}° ${northSouth}, ${Math.abs(longitude).toFixed(2)}° ${eastWest}`;
}

export function shortWeekday(weekday: string): string {
  return weekday.slice(0, 3);
}
