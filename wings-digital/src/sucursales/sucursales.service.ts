import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SucursalesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.sucursal.findMany({
      where: { empresaId: 1 },
      include: { empleados: true },
      orderBy: { nombre: 'asc' }
    });
  }

  async findOne(id: number) {
    const sucursal = await this.prisma.sucursal.findUnique({ where: { id } });
    if (!sucursal) throw new NotFoundException(`Sucursal #${id} no encontrada`);
    return sucursal;
  }

  async create(data: any) {
    return this.prisma.sucursal.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        empresaId: 1, 
        activa: true // Por defecto nace activa
      }
    });
  }

  // ✅ ACTUALIZADO: Ahora permite recibir 'activa' en el body
async update(id: number, data: any) {
    // 1. Verificar si existe
    const existe = await this.prisma.sucursal.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException(`Sucursal #${id} no encontrada`);

    // 2. Actualizar
    return this.prisma.sucursal.update({
      where: { id },
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        // 👇 IMPORTANTE: Esto permite que el switch de activar/desactivar funcione
        activa: data.activa 
      },
    });
  }

  // Dejamos el remove por si algún día logras limpiar las referencias, 
  // pero el frontend usará update para desactivar.
  async remove(id: number) {
     /* ... código de borrado en cascada anterior ... */
     return this.prisma.sucursal.delete({ where: { id } });
  }
}