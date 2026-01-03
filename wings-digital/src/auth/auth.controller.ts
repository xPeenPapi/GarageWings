import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth') // ⬅️ Esto define la ruta base '/auth'
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login') // ⬅️ Esto define la sub-ruta '/login' -> Resultado: '/auth/login'
  signIn(@Body() signInDto: Record<string, any>) {
    // Recibimos email y password del body
    return this.authService.signIn(signInDto.email, signInDto.password);
  }
}