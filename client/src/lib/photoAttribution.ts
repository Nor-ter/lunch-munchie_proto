export type PhotoGpsLocation = { latitude: number; longitude: number };

export type PhotoRestaurantCandidate = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type PhotoRestaurantSuggestion = {
  restaurantId: string;
  distanceMetres: number;
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function suggestPhotoRestaurant(
  location: PhotoGpsLocation,
  restaurants: PhotoRestaurantCandidate[],
  maximumMetres = 250,
): PhotoRestaurantSuggestion | null {
  let closest: PhotoRestaurantSuggestion | null = null;
  for (const restaurant of restaurants) {
    if (!Number.isFinite(restaurant.lat) || !Number.isFinite(restaurant.lng)) continue;
    const latitudeDelta = radians(restaurant.lat - location.latitude);
    const longitudeDelta = radians(restaurant.lng - location.longitude);
    const a = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(location.latitude)) * Math.cos(radians(restaurant.lat)) * Math.sin(longitudeDelta / 2) ** 2;
    const distanceMetres = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (!closest || distanceMetres < closest.distanceMetres) {
      closest = { restaurantId: restaurant.id, distanceMetres: Math.round(distanceMetres) };
    }
  }
  return closest && closest.distanceMetres <= maximumMetres ? closest : null;
}

function rational(view: DataView, offset: number, littleEndian: boolean) {
  const denominator = view.getUint32(offset + 4, littleEndian);
  return denominator ? view.getUint32(offset, littleEndian) / denominator : null;
}

/** Read GPS EXIF from JPEG without uploading the original image or its EXIF. */
export async function readJpegGps(file: File): Promise<PhotoGpsLocation | null> {
  if (!/^image\/jpe?g$/i.test(file.type)) return null;
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 14 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > view.byteLength) return null;
    const exifHeader = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7),
    );
    if (marker !== 0xe1 || length < 10 || exifHeader !== 'Exif') {
      offset += 2 + length;
      continue;
    }
    const tiff = offset + 10;
    const littleEndian = view.getUint16(tiff) === 0x4949;
    if (view.getUint16(tiff + 2, littleEndian) !== 42) return null;
    const readIfd = (relativeOffset: number) => {
      const start = tiff + relativeOffset;
      if (start + 2 > view.byteLength) return [] as Array<{ tag: number; type: number; count: number; value: number }>;
      const count = view.getUint16(start, littleEndian);
      const rows: Array<{ tag: number; type: number; count: number; value: number }> = [];
      for (let index = 0; index < count; index++) {
        const entry = start + 2 + index * 12;
        if (entry + 12 > view.byteLength) return [];
        rows.push({ tag: view.getUint16(entry, littleEndian), type: view.getUint16(entry + 2, littleEndian), count: view.getUint32(entry + 4, littleEndian), value: view.getUint32(entry + 8, littleEndian) });
      }
      return rows;
    };
    const gpsPointer = readIfd(view.getUint32(tiff + 4, littleEndian)).find(row => row.tag === 0x8825)?.value;
    if (!gpsPointer) return null;
    const gps = readIfd(gpsPointer);
    const value = (tag: number) => gps.find(row => row.tag === tag);
    const latitude = value(2);
    const longitude = value(4);
    if (!latitude || !longitude || latitude.type !== 5 || longitude.type !== 5 || latitude.count !== 3 || longitude.count !== 3) return null;
    const coordinate = (entry: { value: number }) => {
      const start = tiff + entry.value;
      const parts = [rational(view, start, littleEndian), rational(view, start + 8, littleEndian), rational(view, start + 16, littleEndian)];
      return parts.every((part): part is number => part !== null) ? parts[0]! + parts[1]! / 60 + parts[2]! / 3600 : null;
    };
    const lat = coordinate(latitude);
    const lng = coordinate(longitude);
    if (lat === null || lng === null) return null;
    const ref = (tag: number) => {
      const entry = value(tag);
      return entry ? String.fromCharCode(view.getUint8(tiff + entry.value)) : '';
    };
    const signedLat = ref(1) === 'S' ? -lat : lat;
    const signedLng = ref(3) === 'W' ? -lng : lng;
    return Math.abs(signedLat) <= 90 && Math.abs(signedLng) <= 180 ? { latitude: signedLat, longitude: signedLng } : null;
  }
  return null;
}
