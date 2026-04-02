import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './application/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordRedefinitionDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { JwtPayload } from './infrastructure/strategies/jwt.strategy';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User created and returns token' })
  @ApiResponse({ status: 409, description: 'Email or CPF already registered' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken and user data',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('password-email-send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send password reset email',
    description:
      'Sends an email with a reset link to the authenticated user. Token expires in 1 hour.',
  })
  @ApiResponse({ status: 200, description: 'Email sent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  sendPasswordResetEmail(@CurrentUser() user: JwtPayload) {
    return this.auth.sendPasswordResetEmail(user.sub);
  }

  @Get('password-email-preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Header('Content-Type', 'text/html')
  @ApiOperation({
    summary: '[Dev] Preview password reset email',
    description:
      'Returns the HTML of the password reset email. Open in browser to see style.',
  })
  @ApiResponse({ status: 200, description: 'HTML content' })
  passwordEmailPreview(@Res({ passthrough: false }) res: Response) {
    res.send(this.auth.getPasswordResetEmailPreview());
  }

  @Post('password-redefinition')
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets password using the token from the email link. Token must be used within 1 hour.',
  })
  @ApiBody({ type: PasswordRedefinitionDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() dto: PasswordRedefinitionDto) {
    return this.auth.resetPassword(dto);
  }
}
