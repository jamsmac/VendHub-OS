import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ICurrentUser } from "../../../common/decorators/current-user.decorator";

/** Fake user injected when AGENT_MODE=true (no real JWT needed). */
const AGENT_USER: ICurrentUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: process.env.AGENT_USER_EMAIL || "agent@vendhub.test",
  firstName: "Agent",
  lastName: "Bot",
  role: process.env.AGENT_USER_ROLE || "owner",
  organizationId:
    process.env.AGENT_ORG_ID || "00000000-0000-0000-0000-000000000001",
};

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly agentMode =
    process.env.AGENT_MODE === "true" && process.env.NODE_ENV !== "production";

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Agent mode: skip JWT, inject fake user into request
    if (this.agentMode) {
      const request = context.switchToHttp().getRequest();
      request.user = AGENT_USER;
      return true;
    }

    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- NestJS framework override signature
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      const authMessage =
        err?.message ||
        (info instanceof Error ? info.message : info?.message) ||
        "Authentication required";

      this.logger.warn(`JWT auth failed: ${authMessage}`);

      throw new UnauthorizedException(authMessage);
    }
    return user;
  }
}
