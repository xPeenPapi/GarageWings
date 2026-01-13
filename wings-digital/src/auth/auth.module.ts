import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module'; // O empleados, si cambiaste el nombre
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Importante para la BD
import { JwtStrategy } from './jwt.strategy'; // ✅ AGREGADO

@Module({
  imports: [
    PrismaModule, // Para poder buscar usuario en BD
    UsersModule,
    JwtModule.register({
      global: true,
      secret: 'TU_CLAVE_SECRETA_SUPER_SEGURA', // Debe coincidir con tu strategy
      signOptions: { expiresIn: '12h' }, // El token dura 12 horas
    }),
  ],
  providers: [AuthService, JwtStrategy], // ✅ AGREGADO JwtStrategy
  controllers: [AuthController], // ⬅️ ¡Sin esto, el controlador no funciona!
  exports: [AuthService],
})
export class AuthModule {}