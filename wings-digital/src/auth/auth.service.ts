import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // 🔴 ANTES: async validateUser(email: string, password: string) {
  // 🟢 AHORA: Cambiamos el nombre a signIn para que coincida con el controlador
  async signIn(email: string, password: string) {
    
    // ✅ INCLUIR SUCURSAL en la consulta
    const user = await this.prisma.empleado.findUnique({
      where: { email },
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true,
            activa: true
          }
        }
      }
    });

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    if (!user.activo) {
      throw new HttpException('Usuario inactivo', HttpStatus.FORBIDDEN);
    }

    // ✅ VALIDACIÓN DE SUCURSAL ACTIVA
    // Solo validar sucursal activa para roles operativos (no admins)
    const rolesOperativos = ['GERENTE', 'MESERO', 'COCINA', 'BARRA', 'CAJA'];
    if (rolesOperativos.includes(user.rol)) {
      if (!user.sucursalId) {
        throw new HttpException('El usuario no tiene sucursal asignada. Contacte al administrador.', HttpStatus.FORBIDDEN);
      }
      
      if (user.sucursal && !user.sucursal.activa) {
        throw new HttpException('La sucursal está inactiva. No puede iniciar sesión. Contacte al administrador.', HttpStatus.FORBIDDEN);
      }
    }

    if (user.password !== password) {
      throw new HttpException('Contraseña incorrecta', HttpStatus.UNAUTHORIZED);
    }

    // ✅ Crear payload del JWT con sucursalId
    const payload = { 
      sub: user.id, 
      email: user.email, 
      rol: user.rol,
      empresaId: user.empresaId,
      sucursalId: user.sucursalId
    };
    
    const token = this.jwtService.sign(payload);

    // ✅ Retornar datos completos incluyendo sucursal
    return {
      access_token: token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        empresaId: user.empresaId,
        sucursalId: user.sucursalId,
        sucursalNombre: user.sucursal?.nombre || 'Sin Sucursal'
      }
    };
  }
}