/**
 * Address search backed by Photon (komoot, Apache-2.0, OpenStreetMap data) —
 * built for search-as-you-type, unlike public Nominatim whose usage policy
 * rules out per-keystroke app traffic.
 *
 * VITE_PHOTON_URL points at our own Photon instance once it's running; until
 * then we use the public komoot instance (fair-use, fine for host onboarding).
 */

const PHOTON_URL =
  (import.meta.env.VITE_PHOTON_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://photon.komoot.io";

// South Africa bounding box (minLon, minLat, maxLon, maxLat) — results stay in SA.
const SA_BBOX = "16.3,-35.0,33.0,-22.0";

export type GeocodeResult = {
  id: string;
  label: string;
  name: string;
  houseNumber: string;
  street: string;
  suburb: string;
  city: string;
  province: string;
  postcode: string;
  lat: number;
  lng: number;
  raw: PhotonFeature;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
};

// Photon's `district` is often an electoral ward ("Johannesburg Ward 60") — useless to people.
const isWard = (value?: string) => !!value && /\bward\s+\d+/i.test(value);

function toResult(feature: PhotonFeature): GeocodeResult {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const houseNumber = p.housenumber ?? "";
  const street = p.street ?? "";
  const suburb = p.locality ?? (isWard(p.district) ? "" : (p.district ?? ""));
  const city = p.city ?? p.county ?? "";
  const name = p.name && p.name !== street ? p.name : "";
  const streetLine = [houseNumber, street].filter(Boolean).join(" ");

  const label = [name, streetLine, suburb, city, p.state]
    .filter((part, i, all): part is string => !!part && all.indexOf(part) === i)
    .join(", ");

  return {
    id: `${p.osm_type ?? "X"}${p.osm_id ?? `${lat},${lng}`}`,
    label,
    name,
    houseNumber,
    street,
    suburb,
    city,
    province: p.state ?? "",
    postcode: p.postcode ?? "",
    lat,
    lng,
    raw: feature,
  };
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({ q: query, limit: "8", lang: "en", bbox: SA_BBOX });
  const response = await fetch(`${PHOTON_URL}/api/?${params}`, { signal });
  if (!response.ok) throw new Error(`Address search failed (${response.status})`);

  const { features } = (await response.json()) as { features: PhotonFeature[] };
  const seen = new Set<string>();
  return features
    .filter((f) => f.properties.countrycode === "ZA")
    .map(toResult)
    .filter((r) => r.label && !seen.has(r.label) && seen.add(r.label))
    .slice(0, 6);
}
