import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoMesa } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwd.guard';

@Controller('mesas')
export class MesasController {
  constructor(private prisma: PrismaService) {}

  // ✅ ENDPOINT MEJORADO: Filtra por sucursal según el rol del usuario
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req) {
    const sucursalId = req.user?.sucursalId;
    const rol = req.user?.rol;
    
    console.log('🏢 Usuario solicitando mesas:', { rol, sucursalId });
    
    // Si es ADMIN o SUPER_ADMIN, devolver todas las mesas
    if (rol === 'ADMIN_EMPRESA' || rol === 'SUPER_ADMIN') {
      return this.prisma.mesa.findMany({
        orderBy: { numero: 'asc' }
      });
    }
    
    // Para roles operativos (GERENTE, MESERO, COCINA, BARRA, CAJA), filtrar por sucursal
    if (!sucursalId) {
      throw new HttpException('Usuario sin sucursal asignada', HttpStatus.FORBIDDEN);
    }
    
    const mesas = await this.prisma.mesa.findMany({
      where: { sucursalId: Number(sucursalId) },
      orderBy: { numero: 'asc' }
    });
    
    console.log(`📊 Devolviendo ${mesas.length} mesas para sucursal ${sucursalId}`);
    return mesas;
  }

  // ⚠️ TEMPORALMENTE SIN GUARD
  @Post()
  async create(@Body() data: any) {
    console.log('📥 Datos recibidos para crear mesa:', data);
    
    // Validar que no exista una mesa con el mismo número en la misma sucursal
    const mesaExistente = await this.prisma.mesa.findFirst({
      where: {
        numero: data.numero,
        sucursalId: Number(data.sucursalId)
      }
    });

    if (mesaExistente) {
      throw new HttpException(
        `Ya existe una mesa con el número "${data.numero}" en esta sucursal`,
        HttpStatus.BAD_REQUEST
      );
    }

    return this.prisma.mesa.create({
      data: {
        numero: data.numero,
        capacidad: Number(data.capacidad),
        tipo: data.tipo || 'cuadrada',
        sucursalId: Number(data.sucursalId),
        estado: 'DISPONIBLE'
      }
    });
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.prisma.mesa.update({
      where: { id },
      data: {
        numero: data.numero,
        capacidad: Number(data.capacidad),
        tipo: data.tipo
      }
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.mesa.delete({ where: { id } });
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

  // ==========================================
  // ✅ NUEVOS ENDPOINTS PARA ADMINISTRACIÓN
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @Post()
  async crearMesa(@Body() createData: any, @Req() req) {
    try {
      const { numero, capacidad, tipo, sucursalId } = createData;
      const usuarioSucursalId = req.user?.sucursalId;
      const rol = req.user?.rol;

      // Validar que tenga permisos
      if (rol !== 'ADMIN_EMPRESA' && rol !== 'SUPER_ADMIN') {
        throw new HttpException('No tienes permisos para crear mesas', HttpStatus.FORBIDDEN);
      }

      // Validar datos requeridos
      if (!numero || !capacidad || !sucursalId) {
        throw new HttpException('Faltan datos: numero, capacidad, sucursalId', HttpStatus.BAD_REQUEST);
      }

      // Verificar que la mesa no exista ya en esa sucursal
      const mesaExistente = await this.prisma.mesa.findFirst({
        where: {
          numero: numero,
          sucursalId: Number(sucursalId)
        }
      });

      if (mesaExistente) {
        throw new HttpException(`Ya existe una mesa ${numero} en esta sucursal`, HttpStatus.CONFLICT);
      }

      // Crear la mesa
      const nuevaMesa = await this.prisma.mesa.create({
        data: {
          numero,
          capacidad: Number(capacidad),
          tipo: tipo || 'cuadrada',
          estado: EstadoMesa.DISPONIBLE,
          posX: createData.posX || 0,
          posY: createData.posY || 0,
          sucursalId: Number(sucursalId)
        }
      });

      console.log(`✅ Mesa ${numero} creada en sucursal ${sucursalId}`);
      return nuevaMesa;

    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Error al crear mesa: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async editarMesa(@Param('id', ParseIntPipe) id: number, @Body() updateData: any, @Req() req) {
    try {
      const rol = req.user?.rol;

      // Validar permisos
      if (rol !== 'ADMIN_EMPRESA' && rol !== 'SUPER_ADMIN') {
        throw new HttpException('No tienes permisos para editar mesas', HttpStatus.FORBIDDEN);
      }

      const mesaActualizada = await this.prisma.mesa.update({
        where: { id },
        data: {
          numero: updateData.numero,
          capacidad: updateData.capacidad ? Number(updateData.capacidad) : undefined,
          tipo: updateData.tipo,
          posX: updateData.posX !== undefined ? Number(updateData.posX) : undefined,
          posY: updateData.posY !== undefined ? Number(updateData.posY) : undefined
        }
      });

      return mesaActualizada;

    } catch (error) {
      throw new HttpException(
        `Error al actualizar mesa: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async eliminarMesa(@Param('id', ParseIntPipe) id: number, @Req() req) {
    try {
      const rol = req.user?.rol;

      // Solo admins pueden eliminar mesas
      if (rol !== 'ADMIN_EMPRESA' && rol !== 'SUPER_ADMIN') {
        throw new HttpException('No tienes permisos para eliminar mesas', HttpStatus.FORBIDDEN);
      }

      // Verificar que la mesa no tenga órdenes activas
      const ordenesActivas = await this.prisma.orden.count({
        where: {
          mesaId: id,
          estado: { not: 'CERRADA' }
        }
      });

      if (ordenesActivas > 0) {
        throw new HttpException(
          'No se puede eliminar una mesa con órdenes activas',
          HttpStatus.CONFLICT
        );
      }

      await this.prisma.mesa.delete({ where: { id } });
      
      console.log(`✅ Mesa ${id} eliminada`);
      return { message: 'Mesa eliminada exitosamente' };

    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Error al eliminar mesa: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}