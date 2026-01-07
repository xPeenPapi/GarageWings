import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoMesa, EstadoOrden } from '@prisma/client';

@Injectable()
export class MesaService {
  constructor(private prisma: PrismaService) {}

  // ✅ 1. LISTAR MESAS CON INFO DE ORDEN ACTIVA
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
        meseroNombre: ordenActiva?.mesero?.nombre || null,
        meseroId: ordenActiva?.meseroId || null,
        comensales: ordenActiva?.comensales || 0,
        horaInicio: ordenActiva?.creadaEn || null,
        ordenId: ordenActiva?.id || null
      };
    });
  }

  // ✅ 2. OBTENER UNA MESA POR ID
  async findOne(id: number) {
    const mesa = await this.prisma.mesa.findUnique({
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

    if (!mesa) throw new NotFoundException(`Mesa con ID ${id} no encontrada`);
    return mesa;
  }

  // ✅ 3. ACTUALIZAR ESTADO MANUALMENTE
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

  // ✅ 4. TRANSFERENCIA DE MESA (CAMBIO DE MESA)
  async transferirMesa(origenId: number, destinoId: number) {
    // A. Validar mesa de origen (Debe tener orden activa)
    const mesaOrigen = await this.prisma.mesa.findUnique({
      where: { id: origenId },
      include: {
        ordenes: {
          where: { estado: { notIn: [EstadoOrden.CERRADA, EstadoOrden.PAGADA, EstadoOrden.CANCELADA] } },
          take: 1
        }
      }
    });

    if (!mesaOrigen || mesaOrigen.ordenes.length === 0) {
      throw new BadRequestException('La mesa de origen no tiene una orden activa para transferir.');
    }

    const ordenId = mesaOrigen.ordenes[0].id;

    // B. Validar mesa de destino (Debe existir y estar DISPONIBLE)
    const mesaDestino = await this.prisma.mesa.findUnique({
      where: { id: destinoId }
    });

    if (!mesaDestino) throw new NotFoundException('La mesa de destino no existe.');
    
    // Aquí validamos estrictamente contra el Enum de Prisma
    if (mesaDestino.estado !== EstadoMesa.DISPONIBLE) {
        throw new BadRequestException(`La mesa destino ${mesaDestino.numero} no está disponible.`);
    }

    // C. Transacción: Mover orden y cambiar estados
    return this.prisma.$transaction(async (tx) => {
      
      // 1. Mover la orden a la nueva mesa
      await tx.orden.update({
        where: { id: ordenId },
        data: { mesaId: destinoId }
      });

      // 2. Liberar la mesa de origen (Pasa a DISPONIBLE)
      // *Nota: Si implementas estado 'SUCIA' después, cámbialo aquí.
      await tx.mesa.update({
        where: { id: origenId },
        data: { estado: EstadoMesa.DISPONIBLE }
      });

      // 3. Ocupar la mesa de destino
      await tx.mesa.update({
        where: { id: destinoId },
        data: { estado: EstadoMesa.OCUPADA }
      });

      return { mensaje: 'Mesa transferida con éxito', nuevaMesaId: destinoId };
    });
  }
}