"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Plus,
  Search,
  MapPin,
  Building,
  Phone,
  Clock,
  Edit,
  Trash2,
  Navigation,
  Map,
  List,
  Eye,
  Coffee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { locationsApi } from "@/lib/api";

// Types
interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  type: string;
  machineCount: number;
  status: string;
  workingHours: string;
  contactPhone: string;
  latitude: number;
  longitude: number;
}

const typeStyles: Record<string, { color: string; bgColor: string }> = {
  mall: { color: "text-purple-700", bgColor: "bg-purple-100" },
  office: { color: "text-blue-700", bgColor: "bg-blue-100" },
  university: { color: "text-green-700", bgColor: "bg-green-100" },
  transport: { color: "text-orange-700", bgColor: "bg-orange-100" },
  other: { color: "text-muted-foreground", bgColor: "bg-muted" },
};

const cityCoords = [
  { key: "city_tashkent", lat: 41.299496, lng: 69.240073 },
  { key: "city_samarkand", lat: 39.6548, lng: 66.959722 },
  { key: "city_bukhara", lat: 39.768889, lng: 64.421389 },
  { key: "city_namangan", lat: 41.0, lng: 71.666667 },
  { key: "city_andijan", lat: 40.783333, lng: 72.333333 },
  { key: "city_fergana", lat: 40.383333, lng: 71.789167 },
  { key: "city_nukus", lat: 42.460833, lng: 59.603611 },
  { key: "city_karshi", lat: 38.860278, lng: 65.8 },
];

const typeFilterKeys = [
  { value: "ALL", key: "typeFilter_all" },
  { value: "mall", key: "typeFilter_mall" },
  { value: "office", key: "typeFilter_office" },
  { value: "university", key: "typeFilter_university" },
  { value: "transport", key: "typeFilter_transport" },
  { value: "other", key: "typeFilter_other" },
] as const;

const typeFormKeys = [
  { value: "mall", key: "typeFilter_mall" },
  { value: "office", key: "typeFilter_office" },
  { value: "university", key: "typeFilter_university" },
  { value: "transport", key: "typeFilter_transport" },
  { value: "other", key: "typeFilter_other" },
] as const;

// --- Map Picker Component ---
interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

function MapPicker({
  initialLat = 41.311081,
  initialLng = 69.279737,
  onLocationSelect,
}: MapPickerProps) {
  const t = useTranslations("locations");
  const mapRef = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const getAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
        return data.display_name;
      }
    } catch {
      // Geocoding failed — user can enter address manually
    }
    setIsLoading(false);
    return "";
  }, []);

  useEffect(() => {
    if (typeof google !== "undefined" && google.maps && mapRef.current) {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: marker.lat, lng: marker.lng },
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      });
      const mapMarker = new google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });
      googleMapRef.current = map;
      markerRef.current = mapMarker;

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          mapMarker.setPosition(e.latLng);
          setMarker({ lat, lng });
          getAddressFromCoords(lat, lng);
        }
      });
      mapMarker.addListener("dragend", () => {
        const position = mapMarker.getPosition();
        if (position) {
          setMarker({ lat: position.lat(), lng: position.lng() });
          getAddressFromCoords(position.lat(), position.lng());
        }
      });
      setMapLoaded(true);
    }
  }, [marker.lat, marker.lng, getAddressFromCoords]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setMarker({ lat, lng });
          if (googleMapRef.current && markerRef.current) {
            const newPos = new google.maps.LatLng(lat, lng);
            googleMapRef.current.panTo(newPos);
            markerRef.current.setPosition(newPos);
          }
          getAddressFromCoords(lat, lng);
        },
        () => {
          toast.error(t("geolocationError"));
        },
      );
    }
  };

  const jumpToCity = (city: { key: string; lat: number; lng: number }) => {
    setMarker({ lat: city.lat, lng: city.lng });
    if (googleMapRef.current && markerRef.current) {
      const newPos = new google.maps.LatLng(city.lat, city.lng);
      googleMapRef.current.panTo(newPos);
      googleMapRef.current.setZoom(14);
      markerRef.current.setPosition(newPos);
    }
    getAddressFromCoords(city.lat, city.lng);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">{t("quickCityJump")}</Label>
        <div className="flex flex-wrap gap-2">
          {cityCoords.map((city) => (
            <Button
              key={city.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => jumpToCity(city)}
            >
              {t(city.key)}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-[50vh] md:h-[400px] bg-muted rounded-lg border overflow-hidden"
        >
          {!mapLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                {t("mapApiKeyNeeded")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("enterCoordsManually")}
              </p>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-3 right-3 shadow-md"
          onClick={getCurrentLocation}
          title={t("myLocation")}
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>{t("latitude")}</Label>
          <Input
            type="number"
            step="0.000001"
            value={marker.lat}
            onChange={(e) => {
              const lat = parseFloat(e.target.value);
              if (!isNaN(lat)) {
                setMarker((prev) => ({ ...prev, lat }));
                if (googleMapRef.current && markerRef.current) {
                  const newPos = new google.maps.LatLng(lat, marker.lng);
                  googleMapRef.current.panTo(newPos);
                  markerRef.current.setPosition(newPos);
                }
              }
            }}
            className="font-mono text-sm"
          />
        </div>
        <div>
          <Label>{t("longitude")}</Label>
          <Input
            type="number"
            step="0.000001"
            value={marker.lng}
            onChange={(e) => {
              const lng = parseFloat(e.target.value);
              if (!isNaN(lng)) {
                setMarker((prev) => ({ ...prev, lng }));
                if (googleMapRef.current && markerRef.current) {
                  const newPos = new google.maps.LatLng(marker.lat, lng);
                  googleMapRef.current.panTo(newPos);
                  markerRef.current.setPosition(newPos);
                }
              }
            }}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <Label>
          {t("address")}
          {isLoading && (
            <span className="ml-2 text-muted-foreground">
              {t("detectingAddress")}
            </span>
          )}
        </Label>
        <div className="flex gap-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("addressAutoPlaceholder")}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => getAddressFromCoords(marker.lat, marker.lng)}
          >
            {t("detectAddress")}
          </Button>
        </div>
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={() => onLocationSelect(marker.lat, marker.lng, address)}
      >
        {t("confirmLocation")}
      </Button>
    </div>
  );
}

// --- Location Form Dialog ---
interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location | null;
  onSave: (location: Partial<Location>) => void;
}

function LocationFormDialog({
  open,
  onOpenChange,
  location,
  onSave,
}: LocationFormProps) {
  const t = useTranslations("locations");
  const [formData, setFormData] = useState({
    name: location?.name || "",
    address: location?.address || "",
    city: location?.city || "",
    type: location?.type || "mall",
    workingHours: location?.workingHours || "",
    contactPhone: location?.contactPhone || "",
    latitude: location?.latitude || 41.311081,
    longitude: location?.longitude || 69.279737,
  });
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name,
        address: location.address,
        city: location.city,
        type: location.type,
        workingHours: location.workingHours,
        contactPhone: location.contactPhone,
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } else {
      setFormData({
        name: "",
        address: "",
        city: "",
        type: "mall",
        workingHours: "",
        contactPhone: "",
        latitude: 41.311081,
        longitude: 69.279737,
      });
    }
  }, [location, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {location ? t("dialogTitleEdit") : t("dialogTitleNew")}
          </DialogTitle>
          <DialogDescription>
            {location ? t("dialogDescEdit") : t("dialogDescNew")}
          </DialogDescription>
        </DialogHeader>

        {showMapPicker ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">{t("mapSelection")}</h3>
              <Button variant="link" onClick={() => setShowMapPicker(false)}>
                {t("backToForm")}
              </Button>
            </div>
            <MapPicker
              initialLat={formData.latitude}
              initialLng={formData.longitude}
              onLocationSelect={(lat, lng, addr) => {
                setFormData((prev) => ({
                  ...prev,
                  latitude: lat,
                  longitude: lng,
                  address: addr || prev.address,
                }));
                setShowMapPicker(false);
              }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t("nameLabel")}</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="city">{t("cityLabel")}</Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, city: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("cityPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityCoords.map((city) => (
                      <SelectItem key={city.key} value={t(city.key)}>
                        {t(city.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">{t("typeLabel")}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeFormKeys.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hours">{t("workingHoursLabel")}</Label>
                <Input
                  id="hours"
                  value={formData.workingHours}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      workingHours: e.target.value,
                    }))
                  }
                  placeholder={t("workingHoursPlaceholder")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">{t("phoneLabel")}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactPhone: e.target.value,
                  }))
                }
                placeholder={t("phonePlaceholder")}
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t("addressAndCoords")}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMapPicker(true)}
                  >
                    <Map className="h-4 w-4 mr-2" />
                    {t("chooseOnMap")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">{t("addressLabel")}</Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    placeholder={t("addressPlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("latitude")}</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          latitude: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label>{t("longitude")}</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          longitude: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                {formData.latitude && formData.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Eye className="h-4 w-4" />
                    {t("viewOnGoogleMaps")}
                  </a>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit">{location ? t("save") : t("add")}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function LocationsPage() {
  const t = useTranslations("locations");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    action: () => void;
  } | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await locationsApi.getAll();
      setLocations(response.data.data);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      const message = apiErr.response?.data?.message || t("loadFailed");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredLocations = useMemo(
    () =>
      locations.filter((loc) => {
        const matchesSearch =
          !debouncedSearch ||
          loc.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          loc.address.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          loc.city.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchesType = selectedType === "ALL" || loc.type === selectedType;
        return matchesSearch && matchesType;
      }),
    [locations, debouncedSearch, selectedType],
  );

  const stats = useMemo(
    () => ({
      total: locations.length,
      active: locations.filter((l) => l.status === "active").length,
      totalMachines: locations.reduce((sum, loc) => sum + loc.machineCount, 0),
      cities: new Set(locations.map((l) => l.city)).size,
    }),
    [locations],
  );

  const handleAddLocation = () => {
    setEditingLocation(null);
    setIsFormOpen(true);
  };

  const handleEditLocation = (loc: Location) => {
    setEditingLocation(loc);
    setIsFormOpen(true);
  };

  const handleSaveLocation = async (data: Partial<Location>) => {
    try {
      if (editingLocation) {
        await locationsApi.update(editingLocation.id, data);
        toast.success(t("locationUpdated"));
      } else {
        await locationsApi.create(data);
        toast.success(t("locationAdded"));
      }
      fetchLocations();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      const message = apiErr.response?.data?.message || t("saveFailed");
      toast.error(message);
    }
  };

  const handleDeleteLocation = (id: string) => {
    setConfirmState({
      title: t("deleteConfirm"),
      action: async () => {
        try {
          await locationsApi.delete(id);
          toast.success(t("locationDeleted"));
          fetchLocations();
        } catch (err: unknown) {
          const apiErr = err as { response?: { data?: { message?: string } } };
          const message = apiErr.response?.data?.message || t("deleteFailed");
          toast.error(message);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={handleAddLocation}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addLocation")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsTotal")}
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsActive")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <Building className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsMachines")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.totalMachines}
                </p>
              </div>
              <Coffee className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("statsCities")}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.cities}
                </p>
              </div>
              <Map className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <p className="text-muted-foreground">{t("loadingLocations")}</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">
              {t("loadErrorTitle")}
            </p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchLocations} variant="outline">
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {!loading && !error && (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeFilterKeys.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "map" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("map")}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {viewMode === "map" ? (
            <Card>
              <CardContent className="pt-6">
                <div className="h-[50vh] md:h-[500px] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">
                      {t("mapApiKeyNeeded")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("locationsInCities", {
                        count: filteredLocations.length,
                        cities: new Set(filteredLocations.map((l) => l.city))
                          .size,
                      })}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {filteredLocations.map((loc) => (
                        <a
                          key={loc.id}
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded hover:bg-primary/20"
                        >
                          <MapPin className="h-3 w-3" />
                          {loc.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : filteredLocations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{t("notFound")}</p>
                <p className="text-muted-foreground mb-4">
                  {t("changeSearch")}
                </p>
                <Button onClick={handleAddLocation}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addLocation")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.map((loc) => {
                const tc = typeStyles[loc.type] || typeStyles.other;
                const typeKey = `type_${loc.type}` as
                  | "type_mall"
                  | "type_office"
                  | "type_university"
                  | "type_transport"
                  | "type_other";
                return (
                  <Card
                    key={loc.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{loc.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {loc.city}
                          </p>
                        </div>
                        <Badge className={`${tc.bgColor} ${tc.color} border-0`}>
                          {t(typeKey)}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">{loc.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>{loc.workingHours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span>{loc.contactPhone}</span>
                        </div>
                        {loc.latitude && loc.longitude && (
                          <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 shrink-0" />
                            <a
                              href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {loc.latitude.toFixed(6)},{" "}
                              {loc.longitude.toFixed(6)}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {loc.machineCount}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {t("machinesCount")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={t("editAriaLabel")}
                            onClick={() => handleEditLocation(loc)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={t("deleteAriaLabel")}
                            onClick={() => handleDeleteLocation(loc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Form Dialog */}
      <LocationFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        location={editingLocation}
        onSave={handleSaveLocation}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title ?? ""}
        description={t("deleteDescription")}
        confirmLabel={t("deleteLabel")}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
