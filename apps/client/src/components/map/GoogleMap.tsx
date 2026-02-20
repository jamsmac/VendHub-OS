import { useEffect, useRef, MutableRefObject } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

interface GoogleMapProps {
  machines: any[];
  userLocation: { latitude: number; longitude: number } | null;
  onMachineClick?: (machine: any) => void;
  mapRef?: MutableRefObject<google.maps.Map | null>;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Tashkent center as default
const DEFAULT_CENTER = { lat: 41.2995, lng: 69.2401 };
const DEFAULT_ZOOM = 13;

function MapComponent({
  machines,
  userLocation,
  onMachineClick,
  mapRef,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const localMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new google.maps.Map(containerRef.current, {
      center: userLocation
        ? { lat: userLocation.latitude, lng: userLocation.longitude }
        : DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    localMapRef.current = map;
    if (mapRef) {
      mapRef.current = map;
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      userMarkerRef.current?.setMap(null);
    };
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!localMapRef.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      });
    } else {
      userMarkerRef.current = new google.maps.Marker({
        position: {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        },
        map: localMapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 1000,
        title: 'Вы здесь',
      });
    }
  }, [userLocation]);

  // Update machine markers
  useEffect(() => {
    if (!localMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    machines.forEach((machine) => {
      if (!machine.latitude || !machine.longitude) return;

      const marker = new google.maps.Marker({
        position: { lat: machine.latitude, lng: machine.longitude },
        map: localMapRef.current!,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="${
                machine.status === 'active' ? '#43302b' : '#9ca3af'
              }" stroke="white" stroke-width="3"/>
              <text x="20" y="26" text-anchor="middle" font-size="16">${
                machine.type === 'coffee' ? '☕' : machine.type === 'snack' ? '🍫' : '🥤'
              }</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20),
        },
        title: machine.name,
        zIndex: machine.status === 'active' ? 100 : 50,
      });

      marker.addListener('click', () => {
        onMachineClick?.(machine);
      });

      markersRef.current.push(marker);
    });
  }, [machines, onMachineClick]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}

function LoadingRender() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    </div>
  );
}

function ErrorRender() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-sm text-destructive">Ошибка загрузки карты</p>
    </div>
  );
}

export function GoogleMap(props: GoogleMapProps) {
  const render = (status: Status) => {
    switch (status) {
      case Status.LOADING:
        return <LoadingRender />;
      case Status.FAILURE:
        return <ErrorRender />;
      case Status.SUCCESS:
        return <MapComponent {...props} />;
    }
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <p className="text-sm text-muted-foreground">
          API ключ Google Maps не настроен
        </p>
      </div>
    );
  }

  return <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render} />;
}
