import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwtService: JwtService,
  ) {}

  // FIX #1: Renamed to 'signTokens' and corrected the return type
  private async signTokens(userId: number, email: string): Promise<{ accessToken: string, refreshToken: string }> {
    const payload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
      secret: this.config.get<string>('JWT_SECRET'),
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });
    // FIX #2: Removed the incorrect type assertion
    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: number, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }
  
  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  }

  async googleLogin(req, res: Response) {
    if (!req.user) {
      throw new BadRequestException('No user from google');
    }
    const { email, firstName, lastName } = req.user;
    const lowerCaseEmail = email.toLowerCase();
    
    let user = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });

    if (!user) {
      const generatedPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(generatedPassword, 12);
      
      user = await this.prisma.user.create({
        data: {
          email: lowerCaseEmail,
          fullName: `${firstName} ${lastName}`,
          password: hashedPassword,
        },
      });
    }
    
    // FIX #3: Corrected the function call to 'signTokens'
    const { accessToken, refreshToken } = await this.signTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, refreshToken);
    this.setTokenCookies(res, accessToken, refreshToken);

    return res.redirect('http://localhost:3000/home');
  }
  
  async register(dto: RegisterDto, res: Response) {
    const { fullName, email, password, confirmPassword } = dto;
    const lowerCaseEmail = email.toLowerCase();
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        fullName,
        email: lowerCaseEmail,
        password: hashedPassword,
      },
    });

    // FIX #3: Corrected the function call
    const { accessToken, refreshToken } = await this.signTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, refreshToken);
    this.setTokenCookies(res, accessToken, refreshToken);

    return { message: 'Account created successfully' };
  }

  async login(dto: LoginDto, res: Response) {
    const { email, password } = dto;
    const lowerCaseEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email:lowerCaseEmail } });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }

    // FIX #3: Corrected the function call
    const { accessToken, refreshToken } = await this.signTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, refreshToken);
    this.setTokenCookies(res, accessToken, refreshToken);

    return { message: 'Login successful'};
  }

  async refreshToken(userId: number, oldRefreshToken: string, res: Response) {
    const refreshTokenFromDb = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    });

    if (!refreshTokenFromDb || refreshTokenFromDb.revoked) {
      throw new ForbiddenException('Access Denied');
    }

    if (refreshTokenFromDb.expiresAt < new Date()) {
      throw new ForbiddenException('Refresh token expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException('Access Denied');
    }

    await this.prisma.refreshToken.update({
      where: { id: refreshTokenFromDb.id },
      data: { revoked: true },
    });

    // FIX #3: Corrected the function call
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await this.signTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, newRefreshToken);
    this.setTokenCookies(res, newAccessToken, newRefreshToken);

    return { message: 'Tokens refreshed successfully' };
  }

  async Logout(refreshToken: string, res: Response) {
    if (refreshToken) {
      const tokenFromDb = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (tokenFromDb) {
        await this.prisma.refreshToken.update({
          where: { id: tokenFromDb.id },
          data: { revoked: true },
        });
      }
    }
    
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  // No changes needed below this line
  async forgotPassword(dto: ForgotPasswordDto) {
    // ...
  }
  async resetPassword(dto: ResetPasswordDto) {
    // ...
  }
  async resendOtp(dto: ForgotPasswordDto) {
    // ...
  }
}