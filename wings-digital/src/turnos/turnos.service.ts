import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TurnosService {
  constructor(private prisma: PrismaService) {}

  // Listar turnos futuros (o de hoy en adelante) por sucursal
  async findAll(sucursalId: number) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return this.prisma.turno.findMany({
      where: { 
        sucursalId: sucursalId, // Filtramos por la sucursal específica
        fecha: { gte: hoy } // Solo mostramos turnos de hoy en adelante
      },
      include: {
        empleado: { select: { nombre: true, rol: true } } // Traemos el nombre del empleado
      },
      orderBy: { fecha: 'asc' }
    });
  }

  // Crear Turno
  async create(data: any) {
    return this.prisma.turno.create({
      data: {
        empleadoId: Number(data.empleadoId),
        
        // 👇 ACTUALIZADO: Ahora usa la sucursal que viene del formulario
        // Si no viene (caso legacy), usa la 1 por defecto para no romper nada
        sucursalId: data.sucursalId ? Number(data.sucursalId) : 1, 
        
        fecha: new Date(data.fecha), 
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        notas: data.notas
      }
    });
  }

  // Eliminar Turno
  async remove(id: number) {
    return this.prisma.turno.delete({ where: { id } });
  }
}