// mesa.controller.ts - BACKEND ACTUALIZADO

import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoMesa } from '@prisma/client';

@Controller('mesas')
export class MesasController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.mesa.findMany({
      orderBy: { numero: 'asc' }
    });
  }

  // ✅ MÉTODO ACTUALIZADO: NO sobrescribe horaApertura si ya existe
  @Patch(':id/estado')
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any
  ) {
    const data: any = {
      estado: updateData.estado
    };
    
    console.log(`📍 Actualizando mesa ${id}:`, updateData);
    
    // Si se está ocupando la mesa
    if (updateData.estado === 'ocupada' || updateData.estado === 'OCUPADA') {
      data.mesero = updateData.mesero || null;
      
      // ✅ SOLO crear horaApertura si viene explícitamente en el body
      // O si la mesa NO tiene horaApertura todavía
      if (updateData.horaApertura) {
        // El frontend envió un timestamp específico (apertura nueva)
        data.horaApertura = new Date(updateData.horaApertura);
        console.log(`✅ Mesa ${id} abierta con timestamp: ${data.horaApertura}`);
      } else {
        // Verificar si la mesa ya tiene horaApertura
        const mesaActual = await this.prisma.mesa.findUnique({
          where: { id },
          select: { horaApertura: true }
        });
        
        if (!mesaActual?.horaApertura) {
          // Es apertura nueva, crear timestamp
          data.horaApertura = new Date();
          console.log(`✅ Mesa ${id} abierta por primera vez: ${data.horaApertura}`);
        } else {
          // Es reentrada, NO tocar horaApertura
          console.log(`ℹ️ Mesa ${id} reentrada - manteniendo horaApertura existente`);
        }
      }
    }
    
    // Si se está liberando la mesa
    if (updateData.estado === 'disponible' || updateData.estado === 'DISPONIBLE') {
      data.mesero = null; // ✅ Limpiar mesero
      data.meseroId = null; // ✅ Limpiar ID del mesero
      data.horaApertura = null; // ✅ Limpiar timestamp
      
      console.log(`🧹 Mesa ${id} liberada y limpiada`);
    }
    
    return this.prisma.mesa.update({
      where: { id },
      data
    });
  }

  @Post('transferir')
  async transferir(@Body() body: { origenId: number; destinoId: number }) {
    const { origenId, destinoId } = body;

    console.log(`🔄 Transfiriendo cuenta: Mesa ${origenId} → Mesa ${destinoId}`);

    // 1. Buscar la mesa origen
    const mesaOrigen = await this.prisma.mesa.findUnique({
      where: { id: origenId },
      include: { ordenes: true }
    });

    if (!mesaOrigen) {
      throw new Error('Mesa origen no encontrada');
    }

    // 2. Buscar órdenes activas
    const ordenesActivas = await this.prisma.orden.findMany({
      where: {
        mesaId: origenId,
        estado: { notIn: ['PAGADA', 'CANCELADA', 'CERRADA'] }
      }
    });

    // 3. Transferir las órdenes al destino
    for (const orden of ordenesActivas) {
      await this.prisma.orden.update({
        where: { id: orden.id },
        data: { mesaId: destinoId }
      });
    }

    // 4. Actualizar estado de las mesas
    await this.prisma.mesa.update({
      where: { id: origenId },
      data: { 
        estado: EstadoMesa.DISPONIBLE,
        mesero: null, // ✅ Limpiar mesero
        meseroId: null,
        horaApertura: null // ✅ Limpiar timestamp
      }
    });

    await this.prisma.mesa.update({
      where: { id: destinoId },
      data: { 
        estado: EstadoMesa.OCUPADA,
        mesero: mesaOrigen.mesero,
        meseroId: mesaOrigen.meseroId,
        horaApertura: mesaOrigen.horaApertura || new Date() // ✅ Mantener o crear timestamp
      }
    });

    console.log(`✅ Transferencia completada: ${ordenesActivas.length} orden(es) movida(s)`);

    return { 
      message: 'Transferencia exitosa',
      ordenesMovidas: ordenesActivas.length
    };
  }
}