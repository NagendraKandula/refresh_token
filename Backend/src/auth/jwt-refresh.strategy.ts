import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// FIX: Add StrategyOptions to the import list
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt'; 
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private config: ConfigService) {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.refresh_token;
        },
      ]),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: Request, payload: any) {
    const refreshToken = req.cookies.refresh_token;
    return { ...payload, refreshToken };
  }
}