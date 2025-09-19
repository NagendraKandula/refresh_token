import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { PrismaService } from './prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtStrategy } from './auth/jwt.strategy';    
import { GoogleStrategy } from './auth/google.strategy'; 
import { JwtRefreshTokenStrategy }  from './auth/jwt-refresh.strategy'; 


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ✅ Makes config available across all modules without re-importing
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService,],
})
export class AppModule {}