import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoOrden, EstadoMesa } from '@prisma/client';

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  // ===================================================
  // 1. CREAR O ACTUALIZAR ORDEN (SOLUCIÓN CORREGIDA)
  // ===================================================
  async create(dto: any) {
    console.log('📦 [INICIO] Crear Pedido. DTO:', JSON.stringify(dto));

    let ordenId: number | null = null; 

    // A. Buscar si existe orden pendiente en la mesa
    if (dto.mesa_id) {
      const ordenPendiente = await this.prisma.orden.findFirst({
        where: {
          mesaId: Number(dto.mesa_id),
          estado: { notIn: [EstadoOrden.CANCELADA, EstadoOrden.PAGADA, EstadoOrden.CERRADA] }
        }
      });
      if (ordenPendiente) ordenId = ordenPendiente.id;
    }

    // ✅ CORRECCIÓN: Permitir órdenes vacías (para adicionales o pedidos progresivos)
    // Solo validamos que si NO hay mesa_id Y NO hay orden_id, debe tener items
    if (!dto.mesa_id && !dto.orden_id && (!dto.items || dto.items.length === 0)) {
        throw new BadRequestException('No se puede crear un pedido nuevo sin productos.');
    }

    // 🛠️ PROCESAMIENTO DE ITEMS (SANITIZACIÓN)
    const itemsProcesados = dto.items && dto.items.length > 0 ? dto.items.map((item: any, index: number) => {
        
        // 1. Detección flexible de nombres de propiedades
        const idProd = item.producto_id || item.productoId || item.id;
        const precio = item.precio_item || item.precio || item.precioUnitario || item.precioBase;
        const cant = item.cantidad;

        // 2. Validaciones numéricas estrictas
        const productoIdFinal = Number(idProd);
        const cantidadFinal = Number(cant);
        const precioFinal = parseFloat(precio);

        if (isNaN(productoIdFinal)) throw new BadRequestException(`El item #${index + 1} no tiene un ID de producto válido.`);
        if (isNaN(cantidadFinal) || cantidadFinal <= 0) throw new BadRequestException(`El item #${index + 1} tiene una cantidad inválida.`);
        if (isNaN(precioFinal) || precioFinal < 0) throw new BadRequestException(`El item #${index + 1} tiene un precio inválido.`);

        // Opciones elegidas
        const opcionesFinales = item.opcionesElegidas || []; 

        return {
            productoId: productoIdFinal,
            cantidad: cantidadFinal,
            precioUnitario: precioFinal,
            notas: item.notas || '',
            opcionesElegidas: opcionesFinales,
            estado: EstadoOrden.PENDIENTE
        };
    }) : [];

    try {
        // B. CASO 1: Agregar items a orden existente
        if (ordenId && itemsProcesados.length > 0) {
            console.log(`➕ Agregando ${itemsProcesados.length} items a Orden ID: ${ordenId}`);
            
            const datosInsertar = itemsProcesados.map((i: any) => ({ ...i, ordenId: ordenId as number }));
            await this.prisma.itemOrden.createMany({ data: datosInsertar });
            
            return this.obtenerOrdenCompleta(ordenId);
        }

        // C. CASO 2: Usar orden_id del DTO (frontend indica que ya existe)
        else if (dto.orden_id && itemsProcesados.length > 0) {
            console.log(`➕ Agregando items a Orden existente ID: ${dto.orden_id}`);
            ordenId = Number(dto.orden_id);
            
            const datosInsertar = itemsProcesados.map((i: any) => ({ ...i, ordenId: ordenId as number }));
            await this.prisma.itemOrden.createMany({ data: datosInsertar });
            
            return this.obtenerOrdenCompleta(ordenId);
        }

        // D. CASO 3: Crear Orden Nueva
        else {
            console.log('✨ Creando Nueva Orden...');
            const notaCliente = dto.notaGeneral || dto.nota_general || 'Cliente';
            
            // Construcción del objeto orden
            const ordenData: any = {
                meseroId: dto.mesero_id ? Number(dto.mesero_id) : (dto.empleado_id ? Number(dto.empleado_id) : null),
                estado: EstadoOrden.PENDIENTE,
                comensales: dto.comensales ? Number(dto.comensales) : 1,
                notaGeneral: notaCliente,
            };

            // Solo agregamos mesaId si existe
            if (dto.mesa_id) ordenData.mesaId = Number(dto.mesa_id);

            // ✅ CORRECCIÓN: Solo agregamos items si hay items procesados
            if (itemsProcesados.length > 0) {
                ordenData.items = { create: itemsProcesados };
            }

            const ordenNueva = await this.prisma.orden.create({
                data: ordenData,
                include: { 
                    mesa: true, 
                    mesero: true,
                    items: { include: { producto: true } } 
                }
            });

            // Actualizar estado de la mesa si existe
            if (dto.mesa_id) {
                await this.prisma.mesa.update({
                    where: { id: Number(dto.mesa_id) },
                    data: { estado: EstadoMesa.OCUPADA }
                });
            }

            return ordenNueva;
        }
    } catch (error: any) {
        console.error('❌ ERROR CRÍTICO AL GUARDAR ORDEN:', error);
        console.error('Stack:', error.stack);
        console.error('DTO recibido:', JSON.stringify(dto, null, 2));
        
        // Enviamos el mensaje de error real al frontend
        throw new InternalServerErrorException(
            `Error al guardar el pedido: ${error.message || 'Error desconocido'}`
        );
    }
  }

  // ===================================================
  // 2. BUSCAR PENDIENTES (COCINA)
  // ===================================================
  async findPendientes() {
    return this.prisma.orden.findMany({
      where: { 
        estado: { notIn: [EstadoOrden.CANCELADA, EstadoOrden.CERRADA] }, 
        items: {
          some: { 
              estado: { in: [EstadoOrden.PENDIENTE, EstadoOrden.EN_PREPARACION] }
          }
        }
      },
      include: {
        mesero: true, 
        mesa: true,
        items: { 
            where: {
                estado: { in: [EstadoOrden.PENDIENTE, EstadoOrden.EN_PREPARACION] }
            },
            include: { producto: true } 
        }
      },
      orderBy: { creadaEn: 'asc' }
    });
  }

  // ===================================================
  // 3. OBTENER VENTAS DEL DÍA (CAJA)
  // ===================================================
  async obtenerOrdenesDelDia() {
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    const ordenesRaw = await this.prisma.orden.findMany({
      where: {
        OR: [
            { estado: EstadoOrden.POR_COBRAR },
            { 
                estado: EstadoOrden.PAGADA,
                creadaEn: { gte: hoyInicio, lte: hoyFin }
            }
        ]     
      },
      include: {
        items: { include: { producto: true } },   
        mesa: true,
        mesero: true
      },
      orderBy: { creadaEn: 'desc' }
    });

    return ordenesRaw.map(orden => {
        const nombreCliente = orden.notaGeneral || 'Cliente';
        const tituloCaja = orden.mesa ? `Mesa ${orden.mesa.numero}` : `Pedido para llevar de ${nombreCliente}`;
        return {
            ...orden,
            identificadorMesa: tituloCaja, 
            nombreCliente: nombreCliente
        };
    });
  }

  // ===================================================
  // 4. ACTUALIZAR ESTADO
  // ===================================================
  async actualizarEstado(id: number, estado: EstadoOrden) {
    await this.prisma.orden.update({ where: { id }, data: { estado } });
    return this.obtenerOrdenCompleta(id);
  }

  // ===================================================
  // 5. SOLICITAR CUENTA
  // ===================================================
  async solicitarCuenta(id: number) {
    const ordenActual = await this.prisma.orden.findUnique({ where: { id } });

    if (ordenActual && ordenActual.mesaId) {
        return this.prisma.orden.updateMany({
            where: { 
                mesaId: ordenActual.mesaId,
                estado: { notIn: [EstadoOrden.PAGADA, EstadoOrden.CANCELADA, EstadoOrden.CERRADA] }
            },
            data: { estado: EstadoOrden.POR_COBRAR }
        });
    } else {
        return this.prisma.orden.update({
            where: { id },
            data: { estado: EstadoOrden.POR_COBRAR }
        });
    }
  }

  // ===================================================
  // 6. FINALIZAR / COBRAR
  // ===================================================
  async finalizarOrden(id: number, datosPago: any) {
    const ordenPagada = await this.prisma.orden.update({
      where: { id },
      data: { 
        estado: EstadoOrden.PAGADA,
        propina: datosPago?.propina || 0,
        metodoPago: datosPago?.metodoPago || 'Efectivo',
        cerradaEn: new Date()
      },
      include: { mesa: true }
    });

    if (ordenPagada.mesaId) {
        await this.prisma.mesa.update({
            where: { id: ordenPagada.mesaId },
            data: { estado: EstadoMesa.SUCIA } 
        });
    }

    return ordenPagada;
  }

  // ===================================================
  // 7. CANCELAR
  // ===================================================
  async cancelarOrden(id: number) {
    const orden = await this.prisma.orden.findUnique({ where: { id } });
    if (!orden) throw new NotFoundException('Orden no encontrada');

    await this.prisma.orden.update({
      where: { id },
      data: { estado: EstadoOrden.CANCELADA }
    });

    if (orden.mesaId) {
       const otrasOrdenesVivas = await this.prisma.orden.count({
           where: {
               mesaId: orden.mesaId,
               estado: { notIn: [EstadoOrden.CANCELADA, EstadoOrden.PAGADA, EstadoOrden.CERRADA] },
               id: { not: id } 
           }
       });

       if (otrasOrdenesVivas === 0) {
           await this.prisma.mesa.update({
            where: { id: orden.mesaId },
            data: { estado: EstadoMesa.DISPONIBLE }
          });
       }
    }
    return { mensaje: 'Orden cancelada' };
  }

  // ===================================================
  // HELPERS
  // ===================================================
  public async obtenerOrdenCompleta(id: number) {
    return this.prisma.orden.findUnique({
      where: { id },
      include: {
        mesero: true, 
        mesa: true,
        items: { include: { producto: true } }
      }
    });
  }

  public async findByMesa(mesaId: number) {
      return this.prisma.orden.findMany({
        where: { 
          mesaId, 
          estado: { notIn: [EstadoOrden.CANCELADA, EstadoOrden.PAGADA, EstadoOrden.CERRADA] }
        },
        include: { items: { include: { producto: true } } }
      });
  }
}