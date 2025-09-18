import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// This guard is linked to the strategy by the name 'jwt-refresh'
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}