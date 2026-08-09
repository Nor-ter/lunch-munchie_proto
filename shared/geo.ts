/**
 * Small, dependency-free geo helpers shared by the Lunchie session API and
 * its tests. Distances are great-circle distances in metres (Haversine), not
 * a latitude/longitude box approximation.
 */
export function isValidCoordinate(latitude: unknown, longitude: unknown) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function distanceMetres(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMetres = 6_371_000;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(fromLatitude)) *
      Math.cos(radians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMetres * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRadius(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: unknown,
  toLongitude: unknown,
  radiusMetres: number,
) {
  if (!isValidCoordinate(toLatitude, toLongitude)) return false;
  return (
    distanceMetres(
      fromLatitude,
      fromLongitude,
      Number(toLatitude),
      Number(toLongitude),
    ) <=
    radiusMetres
  );
}
