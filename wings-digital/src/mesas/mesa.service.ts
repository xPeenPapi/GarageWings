import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoMesa, EstadoOrden } from '@prisma/client';

@Injectable()
export class MesaService {
  constructor(private prisma: PrismaService) {}

  // ===================================================
  // 1. LISTAR MESAS CON INFO DE ORDEN ACTIVA
  // ===================================================
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

    // Mapeamos para que el Frontend reciba un objeto limpio y fácil de usar
    return mesas.map(mesa => {
      const ordenActiva = mesa.ordenes[0];
      return {
        ...mesa,
        // Prioridad: Si hay orden activa, usamos sus datos. Si no, los de la mesa.
        meseroNombre: ordenActiva?.mesero?.nombre || mesa.mesero || null,
        meseroId: ordenActiva?.meseroId || mesa.meseroId || null,
        comensales: ordenActiva?.comensales || 0,
        // Usamos la fecha de creación de la orden para el cronómetro
        horaInicio: ordenActiva?.creadaEn || mesa.horaApertura || null,
        ordenId: ordenActiva?.id || null,
        // Si hay orden activa, forzamos el estado a OCUPADA visualmente
        estado: ordenActiva ? EstadoMesa.OCUPADA : mesa.estado
      };
    });
  }

  // ===================================================
  // 2. OBTENER UNA MESA POR ID
  // ===================================================
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

  // ===================================================
  // 3. ACTUALIZAR ESTADO (Lógica Ocupar / Liberar / Limpiar)
  // ===================================================
  async actualizarEstadoMesa(id: number, updateData: any) {
    console.log(`📍 Intento cambio estado Mesa ${id}:`, updateData);

    // 1. NORMALIZACIÓN: Convertimos a Mayúsculas para que Prisma no falle con "disponible" vs "DISPONIBLE"
    const estadoInput = String(updateData.estado).toUpperCase();
    let estadoFinal: EstadoMesa;

    // 2. Validamos que exista en el Enum de la BD
    if (Object.values(EstadoMesa).includes(estadoInput as EstadoMesa)) {
        estadoFinal = estadoInput as EstadoMesa;
    } else {
        throw new BadRequestException(`El estado '${updateData.estado}' no es válido.`);
    }

    const data: any = {
      estado: estadoFinal // Usamos el valor validado en mayúsculas
    };
    
    // CASO A: OCUPAR MESA
    if (estadoFinal === EstadoMesa.OCUPADA) {
      data.mesero = updateData.mesero || null;
      
      if (updateData.meseroId) {
        data.meseroId = Number(updateData.meseroId);
      }

      // Guardamos la hora de apertura
      data.horaApertura = updateData.horaApertura 
        ? new Date(updateData.horaApertura) 
        : new Date(); 
      
      console.log(`✅ Mesa ${id} marcada como OCUPADA a las ${data.horaApertura}`);
    }
    
    // CASO B: LIBERAR MESA (LIMPIEZA)
    // Esto borra los datos de la mesa cuando pasa a DISPONIBLE (ej. después de limpiarla)
    if (estadoFinal === EstadoMesa.DISPONIBLE) {
      data.mesero = null; 
      data.meseroId = null; 
      data.horaApertura = null; 
      
      console.log(`🧹 Mesa ${id} liberada y datos limpiados`);
    }

    // CASO C: SUCIA (Solo cambia estado, mantiene datos por seguridad)
    if (estadoFinal === EstadoMesa.SUCIA) {
        console.log(`⚠️ Mesa ${id} marcada como SUCIA`);
    }
    
    return this.prisma.mesa.update({
      where: { id },
      data
    });
  }

  // ===================================================
  // 4. TRANSFERENCIA DE MESA (CAMBIO DE MESA)
  // ===================================================
  async transferirMesa(origenId: number, destinoId: number) {
    // A. Validar mesa de origen (Debe tener orden activa)
    const ordenActiva = await this.prisma.orden.findFirst({
      where: { 
          mesaId: origenId,
          estado: { notIn: [EstadoOrden.CERRADA, EstadoOrden.PAGADA, EstadoOrden.CANCELADA] } 
      }
    });

    if (!ordenActiva) {
      throw new BadRequestException('La mesa de origen no tiene una orden activa para transferir.');
    }

    // B. Validar mesa de destino (Debe existir y no estar ocupada)
    const mesaDestino = await this.prisma.mesa.findUnique({
      where: { id: destinoId }
    });

    if (!mesaDestino) throw new NotFoundException('La mesa de destino no existe.');
    
    if (mesaDestino.estado === EstadoMesa.OCUPADA) {
        throw new BadRequestException(`La mesa destino ${mesaDestino.numero} ya está ocupada.`);
    }

    // C. Transacción: Mover orden y cambiar estados
    return this.prisma.$transaction(async (tx) => {
      
      // 1. Mover la orden a la nueva mesa
      await tx.orden.update({
        where: { id: ordenActiva.id },
        data: { mesaId: destinoId }
      });

      // 2. Liberar la mesa de origen (Limpiar datos)
      await tx.mesa.update({
        where: { id: origenId },
        data: { 
            estado: EstadoMesa.DISPONIBLE,
            mesero: null,
            meseroId: null,
            horaApertura: null
        }
      });

      // 3. Ocupar la mesa de destino (Copiar datos de la orden)
      await tx.mesa.update({
        where: { id: destinoId },
        data: { 
            estado: EstadoMesa.OCUPADA,
            meseroId: ordenActiva.meseroId,
            horaApertura: new Date() // Reiniciamos contador en nueva mesa (opcional)
        }
      });

      return { mensaje: `Mesa transferida con éxito a la mesa ${mesaDestino.numero}` };
    });
  }
}