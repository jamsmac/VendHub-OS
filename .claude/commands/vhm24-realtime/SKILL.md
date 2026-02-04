---
name: vhm24-realtime
description: |
  VendHub Realtime - паттерны реального времени.
  NestJS WebSocket Gateway + Socket.IO, телеметрия автоматов, live карта, уведомления.
  Использовать при работе с real-time данными и WebSocket.
  Triggers: "realtime", "websocket", "socket.io", "телеметрия", "live", "карта", "уведомления"
---

# VendHub Realtime

Паттерны для работы с данными в реальном времени через NestJS WebSocket Gateway и Socket.IO.

## Стек

| Компонент | Технология | Версия |
| --------- | ---------- | ------ |
| WebSocket сервер | @nestjs/websockets + @nestjs/platform-socket.io | 11 |
| WebSocket клиент | socket.io-client | 4.7 |
| Redis адаптер | @socket.io/redis-adapter + ioredis | 7 |
| Состояние (фронт) | Zustand | 5 |
| Карта | Yandex Maps API v3 | 3.0 |

## Когда использовать

- Телеметрия автоматов (температура, влажность, уровни бункеров)
- Live карта с обновлениями статусов
- Real-time уведомления
- Статусы онлайн/офлайн автоматов
- Мониторинг бункеров

---

## Серверная часть (NestJS Gateway)

### WebSocket Gateway

```typescript
// src/modules/websocket/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('WebSocket Gateway инициализирован');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Клиент подключён: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Клиент отключён: ${client.id}`);
  }

  // ─── Подписка на комнату ────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.join(data.room);
    this.logger.debug(`Клиент ${client.id} подписался на ${data.room}`);
    return { event: 'subscribed', data: { room: data.room } };
  }

  // ─── Отписка от комнаты ─────────────────────────────────────
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.leave(data.room);
    return { event: 'unsubscribed', data: { room: data.room } };
  }

  // ─── Публикация событий (вызывается из сервисов) ────────────

  /** Обновление статуса автомата */
  emitMachineStatus(machineId: string, status: string) {
    const payload = { machineId, status, timestamp: new Date().toISOString() };

    // В комнату конкретного автомата
    this.server.to(`machine:${machineId}`).emit('machine:status', payload);

    // В общий канал для карты
    this.server.to('machines:all').emit('machine:status', payload);
  }

  /** Телеметрия автомата */
  emitTelemetry(machineId: string, telemetry: MachineTelemetry) {
    this.server.to(`machine:${machineId}`).emit('machine:telemetry', telemetry);
  }

  /** Уведомление пользователю */
  emitNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /** Уведомление организации */
  emitOrgEvent(organizationId: string, event: string, data: any) {
    this.server.to(`org:${organizationId}`).emit(event, data);
  }
}
```

### WebSocket JWT Guard

```typescript
// src/modules/websocket/guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new WsException('Токен не предоставлен');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      // Сохраняем данные пользователя в сокете
      client.data.user = payload;
      return true;
    } catch {
      throw new WsException('Невалидный токен');
    }
  }
}
```

### Redis-адаптер (для масштабирования)

```typescript
// src/modules/websocket/redis-io.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(private app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const configService = this.app.get(ConfigService);
    const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');

    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Redis адаптер для Socket.IO подключён');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      },
    });
    server.adapter(this.adapterConstructor);
    return server;
  }
}
```

### Подключение адаптера в main.ts

```typescript
// src/main.ts (фрагмент)
import { RedisIoAdapter } from './modules/websocket/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Redis адаптер для Socket.IO
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // ... остальная настройка
  await app.listen(3000);
}
```

### WebSocket Module

```typescript
// src/modules/websocket/websocket.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [JwtModule, ConfigModule],
  providers: [EventsGateway, WsJwtGuard],
  exports: [EventsGateway],
})
export class WebsocketModule {}
```

### Использование Gateway из сервисов

```typescript
// src/modules/machines/machines.service.ts (фрагмент)
import { Injectable } from '@nestjs/common';
import { EventsGateway } from '../websocket/events.gateway';

@Injectable()
export class MachinesService {
  constructor(
    private readonly eventsGateway: EventsGateway,
    // ... другие зависимости
  ) {}

  async updateStatus(machineId: string, status: string, userId: string) {
    // Обновление в БД
    await this.machineRepository.update(machineId, {
      status,
      updated_by_id: userId,
    });

    // Real-time уведомление через WebSocket
    this.eventsGateway.emitMachineStatus(machineId, status);
  }
}
```

---

## Клиентская часть (Socket.IO Client + Zustand)

### Zustand-стор для WebSocket

```typescript
// stores/websocket-store.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth-store';

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (room: string) => void;
  unsubscribe: (room: string) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      set({ socket, isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket ошибка подключения:', error.message);
    });
  },

  disconnect: () => {
    const { socket } = get();
    socket?.disconnect();
    set({ socket: null, isConnected: false });
  },

  subscribe: (room: string) => {
    get().socket?.emit('subscribe', { room });
  },

  unsubscribe: (room: string) => {
    get().socket?.emit('unsubscribe', { room });
  },
}));
```

### Хук подписки на events

```typescript
// hooks/useRealtimeSubscription.ts
import { useEffect, useCallback } from 'react';
import { useWebSocketStore } from '@/stores/websocket-store';

interface UseRealtimeOptions<T> {
  room: string;
  event: string;
  onMessage: (data: T) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T>({
  room,
  event,
  onMessage,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const { socket, isConnected, subscribe, unsubscribe } = useWebSocketStore();

  const handleMessage = useCallback(
    (data: T) => {
      onMessage(data);
    },
    [onMessage],
  );

  useEffect(() => {
    if (!isConnected || !socket || !enabled) return;

    // Подписка на комнату
    subscribe(room);

    // Слушаем событие
    socket.on(event, handleMessage);

    return () => {
      unsubscribe(room);
      socket.off(event, handleMessage);
    };
  }, [isConnected, socket, room, event, handleMessage, subscribe, unsubscribe, enabled]);

  return { isConnected };
}
```

---

## Телеметрия автоматов

### Типы данных

```typescript
// types/telemetry.ts
export interface MachineTelemetry {
  machineId: string;       // UUID
  timestamp: string;       // ISO 8601
  status: 'online' | 'offline' | 'maintenance' | 'error';
  temperature: number;
  humidity: number;
  bunkers: BunkerLevel[];
  errors: MachineError[];
  lastSale?: string;       // ISO 8601
  uptime: number;          // секунды
}

export interface BunkerLevel {
  bunkerId: string;        // UUID
  ingredientId: string;    // UUID
  ingredientName: string;
  currentLevel: number;    // граммы
  maxLevel: number;
  percentage: number;
  lowLevelAlert: boolean;
}

export interface MachineError {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  occurredAt: string;      // ISO 8601
}
```

### Компонент мониторинга

```tsx
// components/MachineMonitor.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { api } from '@/lib/api';
import type { MachineTelemetry, BunkerLevel } from '@/types/telemetry';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Thermometer, Droplets, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function MachineMonitor({ machineId }: { machineId: string }) {
  const [telemetry, setTelemetry] = useState<MachineTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time обновления через Socket.IO
  useRealtimeSubscription<MachineTelemetry>({
    room: `machine:${machineId}`,
    event: 'machine:telemetry',
    onMessage: (data) => {
      setTelemetry(data);
    },
  });

  // Начальная загрузка через REST API
  useEffect(() => {
    async function loadTelemetry() {
      try {
        const { data } = await api.get<MachineTelemetry>(
          `/api/v1/machines/${machineId}/telemetry`,
        );
        setTelemetry(data);
      } catch (error) {
        console.error('Ошибка загрузки телеметрии:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTelemetry();
  }, [machineId]);

  if (isLoading) return <LoadingSpinner />;
  if (!telemetry) return <p className="text-muted-foreground">Нет данных телеметрии</p>;

  return (
    <div className="space-y-6">
      {/* Статус */}
      <div className="flex items-center gap-4">
        <StatusIndicator status={telemetry.status} />
        <div>
          <p className="text-sm text-muted-foreground">Последнее обновление</p>
          <p className="font-medium">{formatRelative(telemetry.timestamp)}</p>
        </div>
      </div>

      {/* Датчики */}
      <div className="grid grid-cols-2 gap-4">
        <SensorCard
          icon={<Thermometer className="h-5 w-5" />}
          label="Температура"
          value={`${telemetry.temperature}°C`}
          status={telemetry.temperature > 30 ? 'warning' : 'normal'}
        />
        <SensorCard
          icon={<Droplets className="h-5 w-5" />}
          label="Влажность"
          value={`${telemetry.humidity}%`}
          status={telemetry.humidity > 80 ? 'warning' : 'normal'}
        />
      </div>

      {/* Бункеры */}
      <Card>
        <CardHeader>
          <CardTitle>Уровень ингредиентов</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {telemetry.bunkers.map((bunker) => (
            <BunkerLevelBar key={bunker.bunkerId} bunker={bunker} />
          ))}
        </CardContent>
      </Card>

      {/* Ошибки */}
      {telemetry.errors.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600">Ошибки</CardTitle>
          </CardHeader>
          <CardContent>
            {telemetry.errors.map((error, index) => (
              <ErrorAlert key={index} error={error} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

### Индикатор уровня бункера

```tsx
function BunkerLevelBar({ bunker }: { bunker: BunkerLevel }) {
  const getColor = (percentage: number) => {
    if (percentage < 20) return 'bg-red-500';
    if (percentage < 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{bunker.ingredientName}</span>
        <span className={bunker.lowLevelAlert ? 'text-red-600 font-medium' : ''}>
          {bunker.percentage.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', getColor(bunker.percentage))}
          style={{ width: `${bunker.percentage}%` }}
        />
      </div>
      {bunker.lowLevelAlert && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Низкий уровень
        </p>
      )}
    </div>
  );
}
```

---

## Live карта (Yandex Maps)

```tsx
// components/RealtimeMap.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { api } from '@/lib/api';

interface MachineMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
}

function RealtimeMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const ymapRef = useRef<any>(null);
  const [machines, setMachines] = useState<Map<string, MachineMarker>>(new Map());

  // Начальная загрузка через REST API
  useEffect(() => {
    async function loadMachines() {
      try {
        const { data } = await api.get<MachineMarker[]>('/api/v1/machines?withLocation=true');
        const map = new Map(data.map((m) => [m.id, m]));
        setMachines(map);
      } catch (error) {
        console.error('Ошибка загрузки автоматов:', error);
      }
    }

    loadMachines();
  }, []);

  // Real-time обновления статусов
  useRealtimeSubscription<{ machineId: string; status: string }>({
    room: 'machines:all',
    event: 'machine:status',
    onMessage: (update) => {
      setMachines((prev) => {
        const machine = prev.get(update.machineId);
        if (!machine) return prev;

        const next = new Map(prev);
        next.set(update.machineId, { ...machine, status: update.status });
        return next;
      });
    },
  });

  // Инициализация Yandex Maps
  useEffect(() => {
    if (!mapRef.current || ymapRef.current) return;

    // Yandex Maps API v3 загрузка
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      ymaps3.ready.then(() => {
        // @ts-ignore
        const map = new ymaps3.YMap(mapRef.current, {
          location: { center: [69.2401, 41.2995], zoom: 12 },
        });
        ymapRef.current = map;
      });
    };
    document.head.appendChild(script);

    return () => {
      ymapRef.current?.destroy();
    };
  }, []);

  // Обновление маркеров при изменении данных
  useEffect(() => {
    if (!ymapRef.current) return;
    // Логика обновления маркеров на карте Yandex Maps
    updateMarkers(ymapRef.current, machines);
  }, [machines]);

  return (
    <div ref={mapRef} className="h-full w-full rounded-lg overflow-hidden" />
  );
}

function getMarkerColor(status: string): string {
  const colors: Record<string, string> = {
    online: '#10b981',
    offline: '#ef4444',
    maintenance: '#f59e0b',
    error: '#dc2626',
  };
  return colors[status] || colors.offline;
}
```

---

## Уведомления

```tsx
// components/NotificationCenter.tsx
'use client';

import { useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  createdAt: string;
}

function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const user = useAuthStore((s) => s.user);

  useRealtimeSubscription<Notification>({
    room: `user:${user?.id}`,
    event: 'notification',
    onMessage: (notification) => {
      setNotifications((prev) => [notification, ...prev]);

      // Toast для важных уведомлений
      if (notification.priority === 'high') {
        toast[notification.type === 'error' ? 'error' : 'success'](notification.title, {
          description: notification.message,
        });
      }
    },
    enabled: !!user?.id,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Уведомления</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
          {notifications.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">Нет уведомлений</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## События WebSocket

| Событие | Направление | Описание |
| ------- | ----------- | -------- |
| `subscribe` | client -> server | Подписка на комнату |
| `unsubscribe` | client -> server | Отписка от комнаты |
| `machine:status` | server -> client | Обновление статуса автомата |
| `machine:telemetry` | server -> client | Телеметрия автомата |
| `notification` | server -> client | Уведомление пользователю |
| `task:updated` | server -> client | Обновление задачи |
| `inventory:low` | server -> client | Низкий уровень ингредиента |

## Комнаты (rooms)

| Комната | Описание | Кто подписывается |
| ------- | -------- | ----------------- |
| `machine:{id}` | События конкретного автомата | Страница автомата |
| `machines:all` | Все статусы автоматов | Live карта |
| `user:{id}` | Персональные уведомления | Центр уведомлений |
| `org:{id}` | События организации | Дашборд |
| `tasks:{assigneeId}` | Задачи оператора | Канбан-доска |

## Ссылки

- `references/websocket-events.md` - Полный список событий WebSocket
- `references/telemetry-protocol.md` - Протокол телеметрии автоматов
