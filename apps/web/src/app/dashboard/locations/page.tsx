'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Search, MapPin, Building, Phone, Clock, Edit, Trash2, Navigation, Map, List, Eye, Coffee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { locationsApi } from '@/lib/api';

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

const typeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  mall: { label: 'ТЦ', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  office: { label: 'Офис', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  university: { label: 'Учебное', color: 'text-green-700', bgColor: 'bg-green-100' },
  transport: { label: 'Транспорт', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  other: { label: 'Другое', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

const typeOptions = [
  { value: 'ALL', label: 'Все типы' },
  { value: 'mall', label: 'ТЦ / Торговый центр' },
  { value: 'office', label: 'Офис' },
  { value: 'university', label: 'Учебное заведение' },
  { value: 'transport', label: 'Транспортный узел' },
  { value: 'other', label: 'Другое' },
];

const uzbekistanCities = [
  { name: 'Ташкент', lat: 41.299496, lng: 69.240073 },
  { name: 'Самарканд', lat: 39.654800, lng: 66.959722 },
  { name: 'Бухара', lat: 39.768889, lng: 64.421389 },
  { name: 'Наманган', lat: 41.000000, lng: 71.666667 },
  { name: 'Андижан', lat: 40.783333, lng: 72.333333 },
  { name: 'Фергана', lat: 40.383333, lng: 71.789167 },
  { name: 'Нукус', lat: 42.460833, lng: 59.603611 },
  { name: 'Карши', lat: 38.860278, lng: 65.800000 },
];

// --- Map Picker Component ---
interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

function MapPicker({ initialLat = 41.311081, initialLng = 69.279737, onLocationSelect }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState({ lat: initialLat, lng: initialLng });
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const getAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
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
    return '';
  }, []);

  useEffect(() => {
    if (typeof google !== 'undefined' && google.maps && mapRef.current) {
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

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          mapMarker.setPosition(e.latLng);
          setMarker({ lat, lng });
          getAddressFromCoords(lat, lng);
        }
      });
      mapMarker.addListener('dragend', () => {
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
          toast.error('Не удалось определить местоположение. Выберите вручную.');
        }
      );
    }
  };

  const jumpToCity = (city: { name: string; lat: number; lng: number }) => {
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
        <Label className="mb-2 block">Быстрый переход к городу</Label>
        <div className="flex flex-wrap gap-2">
          {uzbekistanCities.map((city) => (
            <Button key={city.name} type="button" variant="outline" size="sm" onClick={() => jumpToCity(city)}>
              {city.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-[400px] bg-muted rounded-lg border overflow-hidden"
        >
          {!mapLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Для карты нужен Google Maps API ключ</p>
              <p className="text-sm text-muted-foreground">Можно ввести координаты вручную ниже</p>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-3 right-3 shadow-md"
          onClick={getCurrentLocation}
          title="Моё местоположение"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Широта</Label>
          <Input
            type="number"
            step="0.000001"
            value={marker.lat}
            onChange={(e) => {
              const lat = parseFloat(e.target.value);
              if (!isNaN(lat)) {
                setMarker(prev => ({ ...prev, lat }));
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
          <Label>Долгота</Label>
          <Input
            type="number"
            step="0.000001"
            value={marker.lng}
            onChange={(e) => {
              const lng = parseFloat(e.target.value);
              if (!isNaN(lng)) {
                setMarker(prev => ({ ...prev, lng }));
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
          Адрес
          {isLoading && <span className="ml-2 text-muted-foreground">(определение...)</span>}
        </Label>
        <div className="flex gap-2">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Адрес определится автоматически или введите вручную"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={() => getAddressFromCoords(marker.lat, marker.lng)}>
            Определить
          </Button>
        </div>
      </div>

      <Button type="button" className="w-full" onClick={() => onLocationSelect(marker.lat, marker.lng, address)}>
        Подтвердить местоположение
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

function LocationFormDialog({ open, onOpenChange, location, onSave }: LocationFormProps) {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    address: location?.address || '',
    city: location?.city || '',
    type: location?.type || 'mall',
    workingHours: location?.workingHours || '',
    contactPhone: location?.contactPhone || '',
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
        name: '', address: '', city: '', type: 'mall',
        workingHours: '', contactPhone: '',
        latitude: 41.311081, longitude: 69.279737,
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
          <DialogTitle>{location ? 'Редактировать локацию' : 'Новая локация'}</DialogTitle>
          <DialogDescription>
            {location ? 'Измените данные локации' : 'Заполните информацию о новой локации'}
          </DialogDescription>
        </DialogHeader>

        {showMapPicker ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Выбор на карте</h3>
              <Button variant="link" onClick={() => setShowMapPicker(false)}>
                Назад к форме
              </Button>
            </div>
            <MapPicker
              initialLat={formData.latitude}
              initialLng={formData.longitude}
              onLocationSelect={(lat, lng, addr) => {
                setFormData(prev => ({ ...prev, latitude: lat, longitude: lng, address: addr || prev.address }));
                setShowMapPicker(false);
              }}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Tashkent City Mall"
                />
              </div>
              <div>
                <Label htmlFor="city">Город *</Label>
                <Select value={formData.city} onValueChange={(v) => setFormData(prev => ({ ...prev, city: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите город" />
                  </SelectTrigger>
                  <SelectContent>
                    {uzbekistanCities.map((city) => (
                      <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Тип</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.filter(o => o.value !== 'ALL').map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hours">Режим работы</Label>
                <Input
                  id="hours"
                  value={formData.workingHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, workingHours: e.target.value }))}
                  placeholder="09:00 - 22:00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+998 71 200 0001"
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Адрес и координаты
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowMapPicker(true)}>
                    <Map className="h-4 w-4 mr-2" />
                    Выбрать на карте
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Адрес *</Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Введите улицу и дом"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Широта</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label>Долгота</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
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
                    Посмотреть на Google Maps
                  </a>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit">
                {location ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Main Page ---
export default function LocationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; action: () => void } | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await locationsApi.getAll();
      setLocations(response.data.data || response.data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Не удалось загрузить локации';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredLocations = useMemo(() => locations.filter(location => {
    const matchesSearch = !debouncedSearch ||
      location.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      location.address.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      location.city.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesType = selectedType === 'ALL' || location.type === selectedType;
    return matchesSearch && matchesType;
  }), [locations, debouncedSearch, selectedType]);

  const stats = useMemo(() => ({
    total: locations.length,
    active: locations.filter(l => l.status === 'active').length,
    totalMachines: locations.reduce((sum, loc) => sum + loc.machineCount, 0),
    cities: new Set(locations.map(l => l.city)).size,
  }), [locations]);

  const handleAddLocation = () => {
    setEditingLocation(null);
    setIsFormOpen(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setIsFormOpen(true);
  };

  const handleSaveLocation = async (data: Partial<Location>) => {
    try {
      if (editingLocation) {
        await locationsApi.update(editingLocation.id, data);
        toast.success('Локация обновлена');
      } else {
        await locationsApi.create(data);
        toast.success('Локация добавлена');
      }
      fetchLocations();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Не удалось сохранить локацию';
      toast.error(message);
    }
  };

  const handleDeleteLocation = (id: string) => {
    setConfirmState({
      title: 'Удалить локацию?',
      action: async () => {
        try {
          await locationsApi.delete(id);
          toast.success('Локация удалена');
          fetchLocations();
        } catch (err: any) {
          const message = err.response?.data?.message || 'Не удалось удалить локацию';
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
          <h1 className="text-3xl font-bold">Локации</h1>
          <p className="text-muted-foreground">Управление местоположениями автоматов</p>
        </div>
        <Button onClick={handleAddLocation}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить локацию
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего локаций</p>
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
                <p className="text-sm text-muted-foreground">Активных</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Building className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Автоматов</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalMachines}</p>
              </div>
              <Coffee className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Городов</p>
                <p className="text-2xl font-bold text-orange-600">{stats.cities}</p>
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
            <p className="text-muted-foreground">Загрузка локаций...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Ошибка загрузки</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchLocations} variant="outline">
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {!loading && !error && <><div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, адресу, городу..."
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
            {typeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('map')}
          >
            <Map className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'map' ? (
        <Card>
          <CardContent className="pt-6">
            <div className="h-[500px] bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Для карты нужен Google Maps API ключ</p>
                <p className="text-sm text-muted-foreground">
                  {filteredLocations.length} локаций в {new Set(filteredLocations.map(l => l.city)).size} городах
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {filteredLocations.map(loc => (
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
            <p className="text-lg font-medium">Локации не найдены</p>
            <p className="text-muted-foreground mb-4">Попробуйте изменить параметры поиска</p>
            <Button onClick={handleAddLocation}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить локацию
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => {
            const tc = typeConfig[location.type] || typeConfig.other;
            return (
              <Card key={location.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{location.name}</h3>
                      <p className="text-sm text-muted-foreground">{location.city}</p>
                    </div>
                    <Badge className={`${tc.bgColor} ${tc.color} border-0`}>
                      {tc.label}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{location.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>{location.workingHours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{location.contactPhone}</span>
                    </div>
                    {location.latitude && location.longitude && (
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 shrink-0" />
                        <a
                          href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{location.machineCount}</span>
                      <span className="text-sm text-muted-foreground">автоматов</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Редактировать"
                        onClick={() => handleEditLocation(location)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label="Удалить"
                        onClick={() => handleDeleteLocation(location.id)}
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
      </>}

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
        onOpenChange={(open) => { if (!open) setConfirmState(null); }}
        title={confirmState?.title ?? ''}
        description="Это действие нельзя отменить. Локация будет удалена."
        confirmLabel="Удалить"
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
