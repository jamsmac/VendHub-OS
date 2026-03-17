import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { WebSocketService } from "../websocket.service";
import { TokenBlacklistService } from "../../auth/services/token-blacklist.service";
import { BaseGateway, AuthenticatedPayload } from "./base.gateway";
import { Machine } from "../../machines/entities/machine.entity";

interface SubscribeMachinePayload {
  machineId: string;
}

interface SubscribeMachinesPayload {
  machineIds: string[];
}

@WebSocketGateway({
  namespace: "/machines",
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((s: string) => s.trim())
      : [],
    credentials: true,
  },
  transports: ["websocket", "polling"],
})
export class MachineEventsGateway
  extends BaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  protected readonly logger = new Logger(MachineEventsGateway.name);

  constructor(
    jwtService: JwtService,
    wsService: WebSocketService,
    tokenBlacklistService: TokenBlacklistService,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {
    super(jwtService, wsService, tokenBlacklistService);
  }

  afterInit(server: Server) {
    this.wsService.setServer(server);
    this.logger.log("Machine Events Gateway initialized");
  }

  protected onAuthenticated(
    client: Socket,
    payload: AuthenticatedPayload,
  ): void {
    // Auto-join organization room
    if (payload.organizationId) {
      this.wsService.joinRoom(client, `org:${payload.organizationId}`);
    }
  }

  // ============================================
  // Subscribe to Machine Updates
  // ============================================

  @SubscribeMessage("subscribe:machine")
  async handleSubscribeMachine(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeMachinePayload,
  ) {
    const { machineId } = payload;
    const user = this.wsService.getClient(client.id);

    if (!machineId) {
      return { success: false, error: "Machine ID is required" };
    }

    if (!user?.organizationId) {
      return { success: false, error: "Authentication required" };
    }

    try {
      // Verify machine belongs to user's organization
      const machine = await this.machineRepository.findOne({
        where: { id: machineId, organizationId: user.organizationId },
        select: ["id"],
      });

      if (!machine) {
        return { success: false, error: "Machine not found" };
      }

      this.wsService.joinRoom(client, `machine:${machineId}`);
      this.logger.debug(
        `Client ${client.id} subscribed to machine: ${machineId}`,
      );

      return { success: true, machineId };
    } catch (error) {
      this.logger.error(
        `subscribe:machine failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { success: false, error: "Internal error" };
    }
  }

  @SubscribeMessage("unsubscribe:machine")
  handleUnsubscribeMachine(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeMachinePayload,
  ) {
    const { machineId } = payload;

    if (!machineId) {
      return { success: false, error: "Machine ID is required" };
    }

    this.wsService.leaveRoom(client, `machine:${machineId}`);
    this.logger.debug(
      `Client ${client.id} unsubscribed from machine: ${machineId}`,
    );

    return { success: true, machineId };
  }

  @SubscribeMessage("subscribe:machines")
  async handleSubscribeMachines(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeMachinesPayload,
  ) {
    const { machineIds } = payload;
    const user = this.wsService.getClient(client.id);

    if (!machineIds || !Array.isArray(machineIds)) {
      return { success: false, error: "Machine IDs array is required" };
    }

    if (!user?.organizationId) {
      return { success: false, error: "Authentication required" };
    }

    try {
      // Batch-verify all machines belong to user's organization
      const ownedMachines = await this.machineRepository.find({
        where: { id: In(machineIds), organizationId: user.organizationId },
        select: ["id"],
      });

      const ownedIds = new Set(ownedMachines.map((m) => m.id));

      ownedIds.forEach((machineId) => {
        this.wsService.joinRoom(client, `machine:${machineId}`);
      });

      this.logger.debug(
        `Client ${client.id} subscribed to ${ownedIds.size}/${machineIds.length} machines`,
      );

      return { success: true, count: ownedIds.size };
    } catch (error) {
      this.logger.error(
        `subscribe:machines failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { success: false, error: "Internal error" };
    }
  }

  // ============================================
  // Machine Heartbeat (for physical machines)
  // ============================================

  @SubscribeMessage("machine:heartbeat")
  async handleMachineHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      machineId: string;
      status: string;
      metrics?: {
        temperature?: number;
        humidity?: number;
        inventory?: Record<string, number>;
      };
    },
  ) {
    const user = this.wsService.getClient(client.id);

    if (!user?.userId) {
      return { success: false, error: "Authentication required" };
    }

    const { machineId, status, metrics } = payload;

    // Verify machine belongs to sender's organization
    if (!user.organizationId) {
      return { success: false, error: "Organization context required" };
    }

    try {
      const machine = await this.machineRepository.findOne({
        where: { id: machineId, organizationId: user.organizationId },
        select: ["id"],
      });

      if (!machine) {
        return { success: false, error: "Machine not found" };
      }

      // Emit heartbeat to all subscribers
      this.server.to(`machine:${machineId}`).emit("machine:heartbeat", {
        machineId,
        status,
        metrics,
        timestamp: new Date().toISOString(),
      });

      return { success: true, received: new Date().toISOString() };
    } catch (error) {
      this.logger.error(
        `machine:heartbeat failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { success: false, error: "Internal error" };
    }
  }
}
