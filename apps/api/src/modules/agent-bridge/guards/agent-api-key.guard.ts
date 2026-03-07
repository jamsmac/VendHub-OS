import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class AgentApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const agentKey = this.configService.get<string>("AGENT_API_KEY");

    if (!agentKey) {
      throw new ForbiddenException(
        "AGENT_API_KEY not configured - agent bridge disabled",
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers["x-agent-key"] as string | undefined;

    if (provided === agentKey) {
      return true;
    }

    throw new ForbiddenException("Invalid agent API key");
  }
}
