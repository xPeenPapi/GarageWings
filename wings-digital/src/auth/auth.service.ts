import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; 
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async signIn(email: string, pass: string): Promise<any> {
    
    // 1. Buscar al usuario
    const user = await this.prisma.empleado.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Comprobación Híbrida (Texto Plano vs Hash)
    let isMatch = false;

    // A) Primero intentamos comparación directa (Texto plano)
    if (user.password === pass) {
        isMatch = true;
    } 
    // B) Si no coincide, intentamos como Hash (bcrypt)
    else {
        try {
            // El try-catch evita que el servidor explote si user.password no es un hash válido
            isMatch = await bcrypt.compare(pass, user.password);
        } catch (error) {
            isMatch = false;
        }
    }

    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 3. Generar Token
    const payload = { 
      sub: user.id, 
      email: user.email, 
      rol: user.rol,
      nombre: user.nombre, // Importante para el frontend
      empresaId: user.empresaId,
      sucursalId: user.sucursalId
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      message: 'Login exitoso',
      access_token: token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        empresaId: user.empresaId,
        sucursalId: user.sucursalId
      }
    };
  }
}