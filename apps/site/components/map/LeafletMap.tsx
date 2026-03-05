"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useLocale } from "next-intl";
import { localized } from "@/lib/localize";
import type { Machine } from "@/lib/types";

import "leaflet/dist/leaflet.css";

// Tashkent center
const CENTER: L.LatLngExpression = [41.31, 69.28];
const ZOOM = 11;

// Design system colors — keep in sync with tailwind.config.ts
const COLOR_ONLINE = "#7CB69D"; // colors.mint.DEFAULT
const COLOR_OFFLINE = "#E57373"; // status: offline (not in tailwind)
const COLOR_CLUSTER = "#5D4037"; // colors.espresso.DEFAULT

function createMachineIcon(status: string) {
  const color = status === "online" ? COLOR_ONLINE : COLOR_OFFLINE;
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `<div class="leaflet-machine-pin" style="background:${color}">☕</div>`,
  });
}

function createClusterIcon(count: number) {
  return L.divIcon({
    className: "",
    iconSize: [44, 44],
    html: `<div style="
      width:44px;height:44px;border-radius:50%;
      background:${COLOR_CLUSTER};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:14px;font-weight:700;
      font-family:'DM Sans',sans-serif;cursor:pointer;
    ">${count}</div>`,
  });
}

// Fit map bounds to filtered machines
function FitBounds({ machines }: { machines: Machine[] }) {
  const map = useMap();

  useEffect(() => {
    const points = machines
      .filter((m) => m.latitude != null && m.longitude != null)
      .map((m) => [m.latitude!, m.longitude!] as L.LatLngTuple);

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [machines, map]);

  return null;
}

const USER_ICON = L.divIcon({
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: `<div class="leaflet-user-pin"></div>`,
});

interface LeafletMapProps {
  machines: Machine[];
  onMachineClick: (machine: Machine) => void;
  userLocation?: { lat: number; lng: number } | null;
}

export default function LeafletMap({
  machines,
  onMachineClick,
  userLocation,
}: LeafletMapProps) {
  const locale = useLocale();
  const validMachines = useMemo(
    () => machines.filter((m) => m.latitude != null && m.longitude != null),
    [machines],
  );

  return (
    <div className="relative mb-8">
      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        className="h-64 md:h-96 rounded-2xl overflow-hidden shadow-md z-0"
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={(cluster: { getChildCount: () => number }) =>
            createClusterIcon(cluster.getChildCount())
          }
        >
          {validMachines.map((machine) => (
            <Marker
              key={machine.id}
              position={[machine.latitude!, machine.longitude!]}
              icon={createMachineIcon(machine.status)}
              eventHandlers={{
                click: () => onMachineClick(machine),
              }}
            >
              <Popup>
                <div className="text-sm font-medium">{machine.name}</div>
                <div className="text-xs text-gray-500">
                  {localized(machine, "address", locale)}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
        <FitBounds machines={validMachines} />
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={USER_ICON}
          />
        )}
      </MapContainer>
    </div>
  );
}
