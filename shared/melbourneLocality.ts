/**
 * A deliberately small, local locality resolver for the current Lunchie
 * service area.  It has no network dependency: browser coordinates never
 * leave the device merely to render a human-readable area label.
 *
 * These coarse service-area rectangles are derived from OpenStreetMap
 * locality geography and are intentionally used only for display.  They are
 * not a substitute for an address or for routing boundaries.
 */
type LocalityZone = {
  label: string;
  south: number;
  north: number;
  west: number;
  east: number;
};

// Check smaller / overlapping neighbourhoods before broader surrounding ones.
const MELBOURNE_LOCALITIES: LocalityZone[] = [
  { label: 'Carlton', south: -37.813, north: -37.785, west: 144.945, east: 144.979 },
  { label: 'Fitzroy', south: -37.809, north: -37.785, west: 144.979, east: 145.005 },
  { label: 'Parkville', south: -37.812, north: -37.780, west: 144.930, east: 144.955 },
  { label: 'Southbank', south: -37.835, north: -37.815, west: 144.965, east: 144.990 },
  { label: 'South Melbourne', south: -37.855, north: -37.828, west: 144.945, east: 144.972 },
  { label: 'Port Melbourne', south: -37.855, north: -37.820, west: 144.915, east: 144.950 },
  { label: 'Melbourne CBD', south: -37.830, north: -37.800, west: 144.945, east: 144.975 },
];

const MELBOURNE_METRO = { south: -38.0, north: -37.55, west: 144.45, east: 145.45 };

function contains(zone: Omit<LocalityZone, 'label'>, latitude: number, longitude: number) {
  return latitude >= zone.south && latitude <= zone.north
    && longitude >= zone.west && longitude <= zone.east;
}

/**
 * Returns a coarse locality suitable for UI text. Exact addresses need an
 * address dataset or a reverse-geocoding service, so we intentionally do not
 * imply address-level accuracy here.
 */
export function localityForCoordinate(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '현재 위치 주변';
  const locality = MELBOURNE_LOCALITIES.find((zone) => contains(zone, latitude, longitude));
  if (locality) return locality.label;
  return contains(MELBOURNE_METRO, latitude, longitude) ? 'Melbourne 주변' : '현재 위치 주변';
}
