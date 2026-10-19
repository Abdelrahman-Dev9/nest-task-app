import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClerkService } from '../services/clerk.service';

@Injectable()
export class ClerkOrJwtAuthGuard
  extends AuthGuard('jwt')
  implements CanActivate
{
  constructor(private readonly clerkService: ClerkService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: unknown;
    }>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : null;

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    // Clerk session JWTs are typically longer and not signed with our JWT_SECRET.
    if (this.clerkService.isConfigured()) {
      try {
        request.user = await this.clerkService.authenticateBearer(token);
        return true;
      } catch {
        // Fall through to legacy Nest JWT.
      }
    }

    return (await super.canActivate(context)) as boolean;
  }
}
