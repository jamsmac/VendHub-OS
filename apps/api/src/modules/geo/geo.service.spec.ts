import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';

import { GeoService, Coordinates } from './geo.service';
import { Machine } from '../machines/entities/machine.entity';

describe('GeoService', () => {
  let service: GeoService;
  let machineRepo: jest.Mocked<Repository<Machine>>;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const orgId = 'org-uuid-1';
  const apiKey = 'test-google-api-key';

  const tashkentCoords: Coordinates = {
    latitude: 41.2995,
    longitude: 69.2401,
  };

  const samarkandCoords: Coordinates = {
    latitude: 39.6542,
    longitude: 66.9597,
  };

  const mockMachine: Machine = {
    id: 'machine-uuid-1',
    name: 'VM-001',
    serialNumber: 'SN001',
    address: 'Tashkent, Amir Temur 1',
    latitude: 41.3000,
    longitude: 69.2450,
    isOnline: true,
    organizationId: orgId,
  } as unknown as Machine;

  const mockGeocodingResponse = {
    data: {
      status: 'OK',
      results: [
        {
          formatted_address: 'Tashkent, Uzbekistan',
          geometry: {
            location: { lat: 41.2995, lng: 69.2401 },
          },
          place_id: 'ChIJ_abcdef',
          address_components: [
            { long_name: 'Uzbekistan', types: ['country'] },
            { long_name: 'Tashkent', types: ['locality'] },
            { long_name: 'Yunusabad', types: ['sublocality'] },
            { long_name: 'Amir Temur', types: ['route'] },
            { long_name: '1', types: ['street_number'] },
            { long_name: '100000', types: ['postal_code'] },
          ],
        },
      ],
    },
  };

  const mockDirectionsResponse = {
    data: {
      status: 'OK',
      routes: [
        {
          overview_polyline: { points: 'encodedPolyline123' },
          legs: [
            {
              distance: { value: 1500 },
              duration: { value: 1200 },
              steps: [
                {
                  html_instructions: 'Walk <b>north</b> on Main St',
                  distance: { value: 500 },
                  duration: { value: 400 },
                },
                {
                  html_instructions: 'Turn <b>right</b> onto Elm St',
                  distance: { value: 1000 },
                  duration: { value: 800 },
                },
              ],
            },
          ],
        },
      ],
    },
  };

  const mockDistanceMatrixResponse = {
    data: {
      status: 'OK',
      rows: [
        {
          elements: [
            { status: 'OK', distance: { value: 1500 }, duration: { value: 1200 } },
            { status: 'OK', distance: { value: 3000 }, duration: { value: 2400 } },
          ],
        },
      ],
    },
  };

  const mockAutocompleteResponse = {
    data: {
      status: 'OK',
      predictions: [
        {
          place_id: 'place-1',
          description: 'Tashkent, Uzbekistan',
          structured_formatting: {
            main_text: 'Tashkent',
            secondary_text: 'Uzbekistan',
          },
        },
      ],
    },
  };

  const mockPlaceDetailsResponse = {
    data: {
      status: 'OK',
      result: {
        formatted_address: 'Tashkent, Uzbekistan',
        geometry: {
          location: { lat: 41.2995, lng: 69.2401 },
        },
        address_components: [
          { long_name: 'Uzbekistan', types: ['country'] },
          { long_name: 'Tashkent', types: ['locality'] },
        ],
      },
    },
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockMachine]),
    getRawAndEntities: jest.fn().mockResolvedValue({
      entities: [mockMachine],
      raw: [{ distance: '750.5' }],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(apiKey),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<GeoService>(GeoService);
    machineRepo = module.get(getRepositoryToken(Machine));
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // GEOCODING
  // ============================================================================

  describe('geocodeAddress', () => {
    it('should geocode an address successfully', async () => {
      httpService.get.mockReturnValue(of(mockGeocodingResponse) as any);

      const result = await service.geocodeAddress('Tashkent, Uzbekistan');

      expect(result).not.toBeNull();
      expect(result!.formattedAddress).toEqual('Tashkent, Uzbekistan');
      expect(result!.latitude).toEqual(41.2995);
      expect(result!.longitude).toEqual(69.2401);
      expect(result!.placeId).toEqual('ChIJ_abcdef');
      expect(result!.components.country).toEqual('Uzbekistan');
      expect(result!.components.city).toEqual('Tashkent');
    });

    it('should return null when API key is not configured', async () => {
      // Create a service instance without API key
      const moduleNoKey = await Test.createTestingModule({
        providers: [
          GeoService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
          {
            provide: HttpService,
            useValue: { get: jest.fn() },
          },
          {
            provide: getRepositoryToken(Machine),
            useValue: { createQueryBuilder: jest.fn() },
          },
        ],
      }).compile();

      const serviceNoKey = moduleNoKey.get<GeoService>(GeoService);
      const result = await serviceNoKey.geocodeAddress('Test');

      expect(result).toBeNull();
    });

    it('should return null when no results found', async () => {
      httpService.get.mockReturnValue(
        of({ data: { status: 'ZERO_RESULTS', results: [] } }) as any,
      );

      const result = await service.geocodeAddress('NonexistentPlace12345');

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('API Error')) as any,
      );

      const result = await service.geocodeAddress('Test');

      expect(result).toBeNull();
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates', async () => {
      httpService.get.mockReturnValue(of(mockGeocodingResponse) as any);

      const result = await service.reverseGeocode(tashkentCoords);

      expect(result).not.toBeNull();
      expect(result!.formattedAddress).toEqual('Tashkent, Uzbekistan');
    });

    it('should return null when API key missing', async () => {
      const moduleNoKey = await Test.createTestingModule({
        providers: [
          GeoService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
          {
            provide: HttpService,
            useValue: { get: jest.fn() },
          },
          {
            provide: getRepositoryToken(Machine),
            useValue: { createQueryBuilder: jest.fn() },
          },
        ],
      }).compile();

      const serviceNoKey = moduleNoKey.get<GeoService>(GeoService);
      const result = await serviceNoKey.reverseGeocode(tashkentCoords);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Network error')) as any,
      );

      const result = await service.reverseGeocode(tashkentCoords);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // NEARBY MACHINES
  // ============================================================================

  describe('findNearbyMachines', () => {
    it('should find nearby machines with distance', async () => {
      const result = await service.findNearbyMachines(
        tashkentCoords,
        orgId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].machine).toEqual(mockMachine);
      expect(result[0].distance).toEqual(751);
      expect(result[0].duration).toBeDefined();
    });

    it('should filter by online status by default', async () => {
      await service.findNearbyMachines(tashkentCoords, orgId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'm.isOnline = :isOnline',
        { isOnline: true },
      );
    });

    it('should skip online filter when onlyOnline is false', async () => {
      mockQueryBuilder.andWhere.mockClear();

      await service.findNearbyMachines(tashkentCoords, orgId, {
        onlyOnline: false,
      });

      const calls = mockQueryBuilder.andWhere.mock.calls;
      const onlineFilterCalls = calls.filter(
        (c: any[]) => c[0] === 'm.isOnline = :isOnline',
      );
      expect(onlineFilterCalls).toHaveLength(0);
    });

    it('should join with inventory when productId specified', async () => {
      await service.findNearbyMachines(tashkentCoords, orgId, {
        productId: 'product-uuid-1',
      });

      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'm.inventory',
        'inv',
        'inv.productId = :productId AND inv.quantity > 0',
        { productId: 'product-uuid-1' },
      );
    });
  });

  describe('getMachinesInBounds', () => {
    it('should return machines within geographic bounds', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockMachine]);

      const bounds = {
        north: 42.0,
        south: 40.0,
        east: 70.0,
        west: 68.0,
      };

      const result = await service.getMachinesInBounds(
        bounds,
        orgId,
        12,
      );

      expect(result).toEqual([mockMachine]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'm.latitude BETWEEN :south AND :north',
        { south: 40.0, north: 42.0 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'm.longitude BETWEEN :west AND :east',
        { west: 68.0, east: 70.0 },
      );
    });
  });

  // ============================================================================
  // DIRECTIONS
  // ============================================================================

  describe('getDirections', () => {
    it('should return directions between two points', async () => {
      httpService.get.mockReturnValue(of(mockDirectionsResponse) as any);

      const result = await service.getDirections(
        tashkentCoords,
        samarkandCoords,
        'walking',
      );

      expect(result).not.toBeNull();
      expect(result!.distance).toEqual(1500);
      expect(result!.duration).toEqual(1200);
      expect(result!.polyline).toEqual('encodedPolyline123');
      expect(result!.steps).toHaveLength(2);
      expect(result!.steps[0].instruction).toEqual('Walk north on Main St');
    });

    it('should strip HTML tags from step instructions', async () => {
      httpService.get.mockReturnValue(of(mockDirectionsResponse) as any);

      const result = await service.getDirections(
        tashkentCoords,
        samarkandCoords,
      );

      expect(result!.steps[0].instruction).not.toContain('<b>');
      expect(result!.steps[0].instruction).not.toContain('</b>');
    });

    it('should return null when no routes found', async () => {
      httpService.get.mockReturnValue(
        of({ data: { status: 'ZERO_RESULTS', routes: [] } }) as any,
      );

      const result = await service.getDirections(
        tashkentCoords,
        samarkandCoords,
      );

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Directions API error')) as any,
      );

      const result = await service.getDirections(
        tashkentCoords,
        samarkandCoords,
      );

      expect(result).toBeNull();
    });
  });

  describe('getDistanceMatrix', () => {
    it('should return distance matrix for multiple destinations', async () => {
      httpService.get.mockReturnValue(of(mockDistanceMatrixResponse) as any);

      const result = await service.getDistanceMatrix(
        tashkentCoords,
        [samarkandCoords, tashkentCoords],
      );

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0].distance).toEqual(1500);
      expect(result![1].distance).toEqual(3000);
    });

    it('should return null for empty destinations', async () => {
      const result = await service.getDistanceMatrix(tashkentCoords, []);

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Matrix API error')) as any,
      );

      const result = await service.getDistanceMatrix(
        tashkentCoords,
        [samarkandCoords],
      );

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // PLACES AUTOCOMPLETE
  // ============================================================================

  describe('autocompleteAddress', () => {
    it('should return autocomplete suggestions', async () => {
      httpService.get.mockReturnValue(of(mockAutocompleteResponse) as any);

      const result = await service.autocompleteAddress('Tashkent');

      expect(result).toHaveLength(1);
      expect(result[0].placeId).toEqual('place-1');
      expect(result[0].description).toEqual('Tashkent, Uzbekistan');
      expect(result[0].mainText).toEqual('Tashkent');
    });

    it('should return empty array for short input', async () => {
      const result = await service.autocompleteAddress('T');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Autocomplete error')) as any,
      );

      const result = await service.autocompleteAddress('Tashkent');

      expect(result).toEqual([]);
    });
  });

  describe('getPlaceDetails', () => {
    it('should return place details', async () => {
      httpService.get.mockReturnValue(of(mockPlaceDetailsResponse) as any);

      const result = await service.getPlaceDetails('place-1');

      expect(result).not.toBeNull();
      expect(result!.formattedAddress).toEqual('Tashkent, Uzbekistan');
      expect(result!.placeId).toEqual('place-1');
    });

    it('should return null on error', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Details error')) as any,
      );

      const result = await service.getPlaceDetails('place-1');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // STATIC MAP
  // ============================================================================

  describe('getStaticMapUrl', () => {
    it('should generate a static map URL', () => {
      const url = service.getStaticMapUrl(tashkentCoords);

      expect(url).toContain('staticmap');
      expect(url).toContain('41.2995');
      expect(url).toContain('69.2401');
      expect(url).toContain(apiKey);
    });

    it('should include markers in URL', () => {
      const url = service.getStaticMapUrl(tashkentCoords, {
        markers: [
          { lat: 41.3, lng: 69.25, label: 'A', color: 'blue' },
        ],
      });

      expect(url).toContain('markers=');
      expect(url).toContain('blue');
      expect(url).toContain('41.3');
    });

    it('should include path when provided', () => {
      const url = service.getStaticMapUrl(tashkentCoords, {
        path: 'encodedPolyline',
      });

      expect(url).toContain('enc:encodedPolyline');
    });

    it('should use custom zoom and size', () => {
      const url = service.getStaticMapUrl(tashkentCoords, {
        zoom: 18,
        size: '600x400',
      });

      expect(url).toContain('zoom=18');
      expect(url).toContain('size=600x400');
    });
  });

  // ============================================================================
  // UTILITIES
  // ============================================================================

  describe('calculateDistance', () => {
    it('should calculate distance between two points in meters', () => {
      const distance = service.calculateDistance(
        tashkentCoords,
        samarkandCoords,
      );

      // Tashkent to Samarkand is roughly 270-280 km
      expect(distance).toBeGreaterThan(200000);
      expect(distance).toBeLessThan(350000);
    });

    it('should return 0 for same point', () => {
      const distance = service.calculateDistance(
        tashkentCoords,
        tashkentCoords,
      );

      expect(distance).toEqual(0);
    });

    it('should return consistent results regardless of order', () => {
      const d1 = service.calculateDistance(tashkentCoords, samarkandCoords);
      const d2 = service.calculateDistance(samarkandCoords, tashkentCoords);

      expect(d1).toEqual(d2);
    });
  });

  describe('isInUzbekistan', () => {
    it('should return true for Tashkent coordinates', () => {
      expect(service.isInUzbekistan(tashkentCoords)).toBe(true);
    });

    it('should return true for Samarkand coordinates', () => {
      expect(service.isInUzbekistan(samarkandCoords)).toBe(true);
    });

    it('should return false for coordinates outside Uzbekistan', () => {
      const moscowCoords: Coordinates = {
        latitude: 55.7558,
        longitude: 37.6173,
      };
      expect(service.isInUzbekistan(moscowCoords)).toBe(false);
    });

    it('should return false for negative coordinates', () => {
      const southAmericaCoords: Coordinates = {
        latitude: -23.5505,
        longitude: -46.6333,
      };
      expect(service.isInUzbekistan(southAmericaCoords)).toBe(false);
    });

    it('should handle boundary coordinates', () => {
      const edgeCoords: Coordinates = {
        latitude: 37.2,
        longitude: 55.9,
      };
      expect(service.isInUzbekistan(edgeCoords)).toBe(true);
    });
  });
});
