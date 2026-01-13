import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalService {
  constructor(private prisma: PrismaService) {}

  async findAll(empresaId: number) {
    return this.prisma.empleado.findMany({
      where: { empresaId },
      include: {
        sucursal: true
      },
      orderBy: { nombre: 'asc' }
    });
  }

  async create(data: any) {
    const { nombre, email, password, rol, sucursalId, empresaId } = data;

    // ✅ Validaciones básicas
    if (!nombre || !email || !password || !rol || !sucursalId) {
      throw new HttpException('Datos incompletos', HttpStatus.BAD_REQUEST);
    }

    // ✅ VALIDACIÓN DE GERENTE ÚNICO POR SUCURSAL
    if (rol === 'GERENTE') {
      const gerenteExistente = await this.prisma.empleado.findFirst({
        where: {
          sucursalId: Number(sucursalId),
          rol: 'GERENTE',
          activo: true
        }
      });

      if (gerenteExistente) {
        throw new HttpException(
          `La sucursal ya tiene un Gerente activo (${gerenteExistente.nombre}). No se puede asignar otro.`,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // ✅ Verificar si el email ya existe
    const emailExistente = await this.prisma.empleado.findUnique({
      where: { email }
    });

    if (emailExistente) {
      throw new HttpException('El email ya está registrado', HttpStatus.CONFLICT);
    }

    // ✅ Crear empleado (contraseña sin encriptar)
    const nuevoEmpleado = await this.prisma.empleado.create({
      data: {
        nombre,
        email,
        password, // ✅ Directamente sin hash
        rol,
        sucursalId: Number(sucursalId),
        empresaId: Number(empresaId),
        activo: true
      },
      include: {
        sucursal: true
      }
    });

    return {
      success: true,
      message: 'Empleado creado exitosamente',
      empleado: nuevoEmpleado
    };
  }

  async update(id: number, data: any) {
    return this.prisma.empleado.update({
      where: { id },
      data,
      include: {
        sucursal: true
      }
    });
  }

  async remove(id: number) {
    // Soft delete
    return this.prisma.empleado.update({
      where: { id },
      data: { activo: false }
    });
  }
}