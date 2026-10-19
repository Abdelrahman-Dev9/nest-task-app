import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ClerkService {
  private readonly secretKey: string | undefined;
  private readonly clerk;

  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.secretKey = config.get<string>('CLERK_SECRET_KEY');
    this.clerk = this.secretKey
      ? createClerkClient({ secretKey: this.secretKey })
      : null;
  }

  isConfigured() {
    return Boolean(this.secretKey && this.clerk);
  }

  async authenticateBearer(token: string) {
    if (!this.isConfigured() || !this.clerk || !this.secretKey) {
      throw new UnauthorizedException('Clerk is not configured');
    }

    let payload: { sub: string };
    try {
      payload = (await verifyToken(token, {
        secretKey: this.secretKey,
      })) as { sub: string };
    } catch {
      throw new UnauthorizedException('Invalid Clerk session');
    }

    const clerkId = payload.sub;
    if (!clerkId) {
      throw new UnauthorizedException('Invalid Clerk session');
    }

    const existing = await this.usersService.findByClerkId(clerkId);
    if (existing) {
      return this.usersService.toPublic(existing);
    }

    const clerkUser = await this.clerk.users.getUser(clerkId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      throw new UnauthorizedException('Clerk user has no email address');
    }

    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      email.split('@')[0] ||
      'Snap Task user';

    const avatarUrl = clerkUser.imageUrl || null;

    const linked = await this.usersService.linkOrCreateClerkUser({
      clerkId,
      email,
      name,
      avatarUrl,
    });

    return this.usersService.toPublic(linked);
  }
}
