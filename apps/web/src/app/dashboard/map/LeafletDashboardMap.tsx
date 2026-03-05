"use client";

/**
 * LeafletDashboardMap — Admin panel machine map using Leaflet + OpenStreetMap.
 * No API key required. This file MUST only be imported via dynamic() with ssr: false,
 * because Leaflet accesses window/document on import.
 */

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ============================================================================
// Types
// ============================================================================

interface MachineMapItem {
  id: string;
  machineNumber: string;
  name: string;
  status: "online" | "offline" | "warning" | "error" | "maintenance";
  latitude: number;
  longitude: number;
  locationName: string;
  address: string;
}

interface Props<T extends MachineMapItem> {
  machines: T[];
  onMachineClick: (machine: T) => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const TASHKENT: [number, number] = [41.2995, 69.2401];

/** Hex colors matching STATUS_CONFIG in page.tsx */
const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  offline: "#9ca3af",
  warning: "#eab308",
  error: "#ef4444",
  maintenance: "#3b82f6",
};

// ============================================================================
// Helpers
// ============================================================================

/** Custom circular marker icon with status colour */
function createMachineIcon(status: string) {
  const color = STATUS_COLORS[status] ?? "#9ca3af";
  return L.divIcon({
    className: "", // suppress default leaflet class
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
    html: `
      <div style="
        width:34px;height:34px;border-radius:50%;
        background:${color};border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
        font-size:15px;line-height:1;
      ">☕</div>`,
  });
}

// ============================================================================
// FitBounds — adjusts the viewport whenever the machine list changes
// ============================================================================

function FitBounds({ machines }: { machines: MachineMapItem[] }) {
  const map = useMap();

  useEffect(() => {
    const valid = machines.filter((m) => m.latitude && m.longitude);

    if (valid.length === 0) {
      map.setView(TASHKENT, 12);
      return;
    }

    if (valid.length === 1) {
      map.setView([valid[0].latitude, valid[0].longitude], 15);
      return;
    }

    const bounds = L.latLngBounds(
      valid.map((m) => [m.latitude, m.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [machines, map]);

  return null;
}

// ============================================================================
// Main component
// ============================================================================

export function LeafletDashboardMap<T extends MachineMapItem>({ machines, onMachineClick, className }: Props<T>) {
  return (
    <MapContainer
      center={TASHKENT}
      zoom={12}
      className={className}
      // Keep map below any page overlays (floating stats panel uses z-[1000])
      style={{ zIndex: 0 }}
    >
      {/* OpenStreetMap tiles — free, no API key */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Clustered machine markers */}
      <MarkerClusterGroup chunkedLoading>
        {machines
          .filter((m) => m.latitude && m.longitude)
          .map((machine) => (
            <Marker
              key={machine.id}
              position={[machine.latitude, machine.longitude]}
              icon={createMachineIcon(machine.status)}
              eventHandlers={{ click: () => onMachineClick(machine) }}
            >
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <p style={{ fontWeight: 600, marginBottom: 2 }}>
                    {machine.machineNumber}
                  </p>
                  <p style={{ margin: "0 0 2px", fontSize: 13 }}>{machine.name}</p>
                  {machine.locationName && (
                    <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                      {machine.locationName}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MarkerClusterGroup>

      {/* Auto-fit viewport to current machine set */}
      <FitBounds machines={machines} />
    </MapContainer>
  );
}
