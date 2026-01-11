import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SucursalesService {
  constructor(private prisma: PrismaService) {}

  // Listar todas las sucursales de la empresa
  async findAll() {
    return this.prisma.sucursal.findMany({
      where: { empresaId: 1 }, // Asumimos empresa 1 por ahora
      orderBy: { nombre: 'asc' }
    });
  }

  // Crear nueva sucursal
  async create(data: any) {
    return this.prisma.sucursal.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        empresaId: 1, // Vinculado a la empresa principal
        activa: true
      }
    });
  }
}