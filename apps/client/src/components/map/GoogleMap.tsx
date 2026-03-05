/**
 * GoogleMap — Leaflet + OpenStreetMap drop-in replacement.
 * Keeps the same export name so MapPage.tsx requires no import changes.
 * No API key required.
 */

import { useEffect, MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ============================================================================
// Types
// ============================================================================

interface GoogleMapProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  machines: any[];
  userLocation: { latitude: number; longitude: number } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMachineClick?: (machine: any) => void;
  mapRef?: MutableRefObject<L.Map | null>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CENTER: [number, number] = [41.2995, 69.2401]; // Tashkent
const DEFAULT_ZOOM = 13;

// ============================================================================
// Helpers
// ============================================================================

/** Exposes the Leaflet Map instance to the parent via mapRef */
function MapRefSetter({ mapRef }: { mapRef?: MutableRefObject<L.Map | null> }) {
  const map = useMap();

  useEffect(() => {
    if (mapRef) mapRef.current = map;
    return () => {
      if (mapRef) mapRef.current = null;
    };
  }, [map, mapRef]);

  return null;
}

/** Custom circular machine icon — matches the machine type with an emoji */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMachineIcon(machine: any) {
  const color = machine.status === "active" ? "#43302b" : "#9ca3af";
  const emoji =
    machine.type === "coffee" ? "☕" : machine.type === "snack" ? "🍫" : "🥤";

  return L.divIcon({
    className: "", // suppress default leaflet styles
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
    html: `<div style="
      width:40px;height:40px;border-radius:50%;
      background:${color};border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:18px;line-height:1;
    ">${emoji}</div>`,
  });
}

// ============================================================================
// Inner map content — must be a descendant of <MapContainer>
// ============================================================================

function MapInner({
  machines,
  userLocation,
  onMachineClick,
  mapRef,
}: GoogleMapProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* OpenStreetMap tiles — free, no API key */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location — blue dot */}
      {userLocation && (
        <CircleMarker
          center={[userLocation.latitude, userLocation.longitude]}
          radius={9}
          pathOptions={{
            fillColor: "#4285F4",
            color: "#ffffff",
            weight: 2.5,
            fillOpacity: 1,
          }}
          zIndexOffset={1000}
        >
          <Popup>{t("mapYouAreHere")}</Popup>
        </CircleMarker>
      )}

      {/* Clustered machine markers */}
      <MarkerClusterGroup chunkedLoading>
        {machines
          .filter((m) => m.latitude && m.longitude)
          .map((machine) => (
            <Marker
              key={machine.id}
              position={[machine.latitude, machine.longitude]}
              icon={createMachineIcon(machine)}
              title={machine.name}
              eventHandlers={{ click: () => onMachineClick?.(machine) }}
            >
              <Popup>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{machine.name}</p>
                  {machine.address && (
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12,
                        color: "#6b7280",
                      }}
                    >
                      {machine.address}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MarkerClusterGroup>

      {/* Expose Leaflet map instance to parent via mapRef */}
      <MapRefSetter mapRef={mapRef} />
    </>
  );
}

// ============================================================================
// Main export — drop-in replacement for the Google Maps version
// ============================================================================

export function GoogleMap(props: GoogleMapProps) {
  const { userLocation } = props;

  // Use user location as initial center if available, otherwise default to Tashkent
  const initialCenter: [number, number] = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : DEFAULT_CENTER;

  return (
    <MapContainer
      center={initialCenter}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full"
      style={{ zIndex: 0 }}
    >
      <MapInner {...props} />
    </MapContainer>
  );
}
