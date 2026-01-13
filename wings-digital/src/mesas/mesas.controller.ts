import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoMesa } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwd.guard';

@Controller('mesas')
export class MesasController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req) {
    const sucursalId = req.user?.sucursalId;
    const rol = req.user?.rol;

    // Si es ADMIN, trae todas las mesas. Si es GERENTE, filtra por su sucursal
    const whereClause: any = {};
    if (rol !== 'ADMIN_EMPRESA' && rol !== 'SUPER_ADMIN' && sucursalId) {
      whereClause.sucursalId = sucursalId;
    }

    return this.prisma.mesa.findMany({
      where: whereClause,
      orderBy: { numero: 'asc' }
    });
  }

  // ✅ MÉTODO CORREGIDO: Normaliza estados y maneja MANTENIMIENTO correctamente
  @Patch(':id/estado')
  async actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any
  ) {
    try {
      console.log(`📍 Actualizando mesa ${id}:`, updateData);
      
      // ✅ NORMALIZAR ESTADO A ENUM DE PRISMA
      let estadoNormalizado: EstadoMesa;
      
      // Convertir a mayúsculas y manejar undefined
      const estadoRecibido = String(updateData.estado || '').toUpperCase();
      
      switch(estadoRecibido) {
        case 'DISPONIBLE':
        case 'LIBRE':
          estadoNormalizado = EstadoMesa.DISPONIBLE;
          break;
        case 'OCUPADA':
          estadoNormalizado = EstadoMesa.OCUPADA;
          break;
        case 'SUCIA':
          estadoNormalizado = EstadoMesa.SUCIA;
          break;
        case 'MANTENIMIENTO': // 👈 Soporte para el nuevo estado
          estadoNormalizado = EstadoMesa.MANTENIMIENTO;
          break;
        default:
          console.warn(`⚠️ Estado desconocido "${estadoRecibido}", forzando a DISPONIBLE`);
          estadoNormalizado = EstadoMesa.DISPONIBLE;
      }
      
      const data: any = {
        estado: estadoNormalizado
      };
      
      // ✅ CASO 1: OCUPAR MESA
      if (estadoNormalizado === EstadoMesa.OCUPADA) {
        data.mesero = updateData.mesero || null;
        // Solo asignamos ID si viene y es un número válido
        if (updateData.meseroId) {
            data.meseroId = Number(updateData.meseroId);
        }
        
        if (updateData.horaApertura) {
          // El frontend envió un timestamp específico (apertura nueva)
          data.horaApertura = new Date(updateData.horaApertura);
          console.log(`✅ Mesa ${id} abierta con timestamp: ${data.horaApertura}`);
        } else {
          // Verificar si la mesa ya tiene horaApertura (Reentrada)
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
      
      // ✅ CASO 2: LIBERAR, LIMPIAR O DESACTIVAR (MANTENIMIENTO)
      if (
          estadoNormalizado === EstadoMesa.DISPONIBLE || 
          estadoNormalizado === EstadoMesa.SUCIA || 
          estadoNormalizado === EstadoMesa.MANTENIMIENTO
      ) {
        data.mesero = null;
        data.meseroId = null;
        data.horaApertura = null;
        
        console.log(`🧹 Mesa ${id} liberada/limpiada/desactivada - Estado: ${estadoNormalizado}`);
      }
      
      const mesaActualizada = await this.prisma.mesa.update({
        where: { id },
        data
      });
      
      console.log(`✅ Mesa ${id} actualizada exitosamente`);
      return mesaActualizada;
      
    } catch (error) {
      console.error(`❌ Error actualizando mesa ${id}:`, error);
      throw new HttpException(
        `Error al actualizar mesa: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('transferir')
  async transferir(@Body() body: { origenId: number; destinoId: number }) {
    const { origenId, destinoId } = body;

    try {
      console.log(`🔄 Transfiriendo cuenta: Mesa ${origenId} → Mesa ${destinoId}`);

      // 1. Buscar la mesa origen
      const mesaOrigen = await this.prisma.mesa.findUnique({
        where: { id: origenId },
        include: { ordenes: true }
      });

      if (!mesaOrigen) {
        throw new HttpException('Mesa origen no encontrada', HttpStatus.NOT_FOUND);
      }

      // 2. Verificar que la mesa destino existe
      const mesaDestino = await this.prisma.mesa.findUnique({
        where: { id: destinoId }
      });

      if (!mesaDestino) {
        throw new HttpException('Mesa destino no encontrada', HttpStatus.NOT_FOUND);
      }

      // 3. Buscar órdenes activas
      const ordenesActivas = await this.prisma.orden.findMany({
        where: {
          mesaId: origenId,
          estado: { notIn: ['PAGADA', 'CANCELADA', 'CERRADA'] }
        }
      });

      if (ordenesActivas.length === 0) {
        throw new HttpException('No hay órdenes activas para transferir', HttpStatus.BAD_REQUEST);
      }

      // 4. Transferir las órdenes al destino (usando transacción)
      await this.prisma.$transaction(async (prisma) => {
        // Transferir órdenes
        for (const orden of ordenesActivas) {
          await prisma.orden.update({
            where: { id: orden.id },
            data: { mesaId: destinoId }
          });
        }

        // Actualizar mesa origen (liberarla)
        await prisma.mesa.update({
          where: { id: origenId },
          data: { 
            estado: EstadoMesa.DISPONIBLE,
            mesero: null,
            meseroId: null,
            horaApertura: null
          }
        });

        // Actualizar mesa destino (ocuparla)
        await prisma.mesa.update({
          where: { id: destinoId },
          data: { 
            estado: EstadoMesa.OCUPADA,
            mesero: mesaOrigen.mesero,
            meseroId: mesaOrigen.meseroId,
            horaApertura: mesaOrigen.horaApertura || new Date()
          }
        });
      });

      console.log(`✅ Transferencia completada: ${ordenesActivas.length} orden(es) movida(s)`);

      return { 
        success: true,
        message: 'Transferencia exitosa',
        ordenesMovidas: ordenesActivas.length
      };

    } catch (error) {
      console.error('❌ Error en transferencia:', error);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Error al transferir mesa: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ ENDPOINT ADICIONAL: Liberar mesa directamente
  @Patch(':id/liberar')
  async liberarMesa(@Param('id', ParseIntPipe) id: number) {
    try {
      console.log(`🧹 Liberando mesa ${id}`);
      
      const mesaActualizada = await this.prisma.mesa.update({
        where: { id },
        data: {
          estado: EstadoMesa.DISPONIBLE,
          mesero: null,
          meseroId: null,
          horaApertura: null
        }
      });
      
      console.log(`✅ Mesa ${id} liberada exitosamente`);
      return mesaActualizada;
      
    } catch (error) {
      console.error(`❌ Error liberando mesa ${id}:`, error);
      throw new HttpException(
        `Error al liberar mesa: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ✅ ENDPOINT ADICIONAL: Marcar mesa como sucia
  @Patch(':id/marcar-sucia')
  async marcarSucia(@Param('id', ParseIntPipe) id: number) {
    try {
      console.log(`🧽 Marcando mesa ${id} como sucia`);
      
      const mesaActualizada = await this.prisma.mesa.update({
        where: { id },
        data: {
          estado: EstadoMesa.SUCIA,
          mesero: null,
          meseroId: null,
          horaApertura: null
        }
      });
      
      console.log(`✅ Mesa ${id} marcada como sucia`);
      return mesaActualizada;
      
    } catch (error) {
      console.error(`❌ Error marcando mesa ${id} como sucia:`, error);
      throw new HttpException(
        `Error al marcar mesa como sucia: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}