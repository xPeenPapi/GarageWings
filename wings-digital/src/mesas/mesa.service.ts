import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoMesa, EstadoOrden } from '@prisma/client';

@Injectable()
export class MesaService {
  constructor(private prisma: PrismaService) {}

  // ✅ MODIFICADO: Devuelve mesas con info de la orden activa (Mesero, Tiempo, Pax)
  async findAll() {
    const mesas = await this.prisma.mesa.findMany({
      orderBy: { numero: 'asc' },
      include: {
        ordenes: {
          // Buscamos órdenes VIVAS (No cerradas, no pagadas, no canceladas)
          where: { 
            estado: { notIn: [EstadoOrden.CERRADA, EstadoOrden.PAGADA, EstadoOrden.CANCELADA] } 
          },
          take: 1, // Solo la última activa
          include: { mesero: true } // Traemos datos del empleado
        }
      }
    });

    // Mapeamos para que el Frontend reciba un objeto limpio
    return mesas.map(mesa => {
      const ordenActiva = mesa.ordenes[0];
      return {
        ...mesa,
        // Si hay orden, sacamos los datos. Si no, van nulos.
        meseroNombre: ordenActiva?.mesero?.nombre || null,
        meseroId: ordenActiva?.meseroId || null,
        comensales: ordenActiva?.comensales || 0,
        horaInicio: ordenActiva?.creadaEn || null,
        ordenId: ordenActiva?.id || null
      };
    });
  }

  async findOne(id: number) {
    return this.prisma.mesa.findUnique({
      where: { id },
      include: {
        ordenes: {
          where: { 
            estado: { notIn: [EstadoOrden.CERRADA, EstadoOrden.CANCELADA, EstadoOrden.PAGADA] } 
          },
          include: { 
            items: { include: { producto: true } } 
          }
        }
      }
    });
  }

  async actualizarEstado(id: number, estado: string) {
    const estadoEnum = estado.toUpperCase() as EstadoMesa;

    if (!Object.values(EstadoMesa).includes(estadoEnum)) {
      throw new BadRequestException(`El estado '${estado}' no es válido para una mesa.`);
    }

    return this.prisma.mesa.update({
      where: { id },
      data: { estado: estadoEnum }
    });
  }
}