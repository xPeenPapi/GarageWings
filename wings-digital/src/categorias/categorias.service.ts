import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegúrate de que la ruta a prisma sea correcta

@Injectable()
export class CategoriasService {
  constructor(private prisma: PrismaService) {}

  // Obtener todas las categorías (para el menú)
  async findAll() {
    return this.prisma.categoria.findMany({
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });
  }

  // Obtener una categoría por ID
  async findOne(id: number) {
    return this.prisma.categoria.findUnique({
      where: { id }
    });
  }

  // Crear categoría (por si lo necesitas a futuro)
  async create(data: any) {
    return this.prisma.categoria.create({
      data
    });
  }

  // ✅ EL MÉTODO QUE TE FALTABA: Actualizar (Activar/Desactivar)
  async update(id: number, data: any) {
    return this.prisma.categoria.update({
      where: { id },
      data: data // Aquí Prisma actualizará el campo 'activo'
    });
  }

  // Eliminar
  async remove(id: number) {
    return this.prisma.categoria.delete({
      where: { id }
    });
  }
}