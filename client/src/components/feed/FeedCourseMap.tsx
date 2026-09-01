import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CoursePlace } from '@/types/course';

function createStopIcon(order: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50%;background:#E85053;color:#fff;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 3px 10px rgba(84,44,31,.28)">${order}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitCourseBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 15);
      return;
    }
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [34, 34], maxZoom: 15 });
    }
  }, [map, positions]);

  return null;
}

export function FeedCourseMap({ places }: { places: CoursePlace[] }) {
  const geoPlaces = useMemo(() => places.filter(
    (place): place is CoursePlace & { latitude: number; longitude: number } => (
      typeof place.latitude === 'number' && typeof place.longitude === 'number'
    ),
  ), [places]);
  const positions = useMemo<[number, number][]>(
    () => geoPlaces.map(place => [place.latitude, place.longitude]),
    [geoPlaces],
  );

  if (geoPlaces.length === 0) return null;

  return (
    <MapContainer
      center={positions[0]}
      zoom={14}
      className="h-full w-full"
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <FitCourseBounds positions={positions} />
      {geoPlaces.map((place, index) => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={createStopIcon(index + 1)}
        >
          <Popup>
            <strong>{place.name}</strong>
            {place.address ? <><br />{place.address}</> : null}
          </Popup>
        </Marker>
      ))}
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          color="#E85053"
          weight={5}
          opacity={0.9}
          lineCap="round"
          lineJoin="round"
        />
      )}
    </MapContainer>
  );
}
