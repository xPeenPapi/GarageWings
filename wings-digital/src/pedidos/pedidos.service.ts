import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoOrden, EstadoMesa } from '@prisma/client';

@Injectable()
export class PedidosService {
  constructor(private prisma: PrismaService) {}

  // ===================================================
  // 1. CREAR O ACTUALIZAR ORDEN (LÓGICA SEPARADA)
  // ===================================================
  async create(dto: any) {
    // 🔍 LOG DE DEPURACIÓN
    console.log('📦 DTO Recibido en Service:', JSON.stringify(dto));

    let ordenId: number | null = null; 

    // A. Buscar si existe una orden que AÚN NO SE COCINA (PENDIENTE)
    if (dto.mesa_id) {
      const ordenPendiente = await this.prisma.orden.findFirst({
        where: {
          mesaId: dto.mesa_id,
          estado: EstadoOrden.PENDIENTE 
        }
      });
      
      if (ordenPendiente) {
        ordenId = ordenPendiente.id;
      }
    }

    // B. CASO 1: Existe una orden PENDIENTE -> Agregamos items ahí (Agrupar)
    if (ordenId && dto.items && dto.items.length > 0) {
      console.log(`➕ Agrupando items en la orden PENDIENTE #${ordenId}`);
      
      await this.prisma.itemOrden.createMany({
        data: dto.items.map((item: any) => ({
          ordenId: ordenId as number,
          productoId: item.producto_id,
          cantidad: item.cantidad,
          precioUnitario: item.precio_item,
          notas: item.notas,
          opcionesElegidas: item.opcionesElegidas,
          estado: EstadoOrden.PENDIENTE
        }))
      });
      
      return this.obtenerOrdenCompleta(ordenId);
    }

    // C. CASO 2: No hay orden o la que hay ya se está cocinando -> CREAMOS UNA NUEVA
    else {
      console.log('✨ La orden anterior ya se está cocinando o no existe. Creando ORDEN NUEVA separada...');
      
      const tieneItems = dto.items && Array.isArray(dto.items) && dto.items.length > 0;

      // ✅ CORRECCIÓN CRÍTICA: Capturar nombre del cliente (Para Llevar)
      const notaCliente = dto.notaGeneral || dto.nota_general || '';

      console.log('👤 Nombre Cliente Detectado:', notaCliente); 

      // DATA OBJECT FOR PRISMA
      const ordenData = {
        mesaId: dto.mesa_id || null,
        meseroId: dto.mesero_id || dto.empleado_id,
        estado: EstadoOrden.PENDIENTE,
        comensales: dto.comensales || 1,
        notaGeneral: notaCliente, // Verify this is not undefined
        items: tieneItems ? {
          create: dto.items.map((item: any) => ({
            productoId: item.producto_id,
            cantidad: item.cantidad,
            precioUnitario: item.precio_item,
            notas: item.notas,
            opcionesElegidas: item.opcionesElegidas
          }))
        } : undefined
      };

      console.log('📝 OBJETO FINAL A PRISMA:', JSON.stringify(ordenData));

      const ordenNueva = await this.prisma.orden.create({
        data: ordenData,
        include: {
          mesa: true,
          items: { include: { producto: true } }
        }
      });

      // Actualizamos mesa solo si existe ID
      if (dto.mesa_id) {
          await this.prisma.mesa.update({
              where: { id: dto.mesa_id },
              data: { estado: EstadoMesa.OCUPADA }
          });
      }

      return ordenNueva;
    }
  }

  // ===================================================
  // 2. BUSCAR PENDIENTES (Cocina)
  // ===================================================
  async findPendientes() {
    return this.prisma.orden.findMany({
      where: { 
        estado: { notIn: [EstadoOrden.CERRADA, EstadoOrden.PAGADA, EstadoOrden.CANCELADA, EstadoOrden.POR_COBRAR] },
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
  // 3. OBTENER VENTAS DEL DÍA (Caja)
  // ===================================================
  async obtenerOrdenesDelDia() {
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    const ordenesRaw = await this.prisma.orden.findMany({
      where: {
        creadaEn: { gte: hoyInicio, lte: hoyFin },
        estado: { in: [EstadoOrden.POR_COBRAR, EstadoOrden.PAGADA] }      
      },
      include: {
        items: { include: { producto: true } },   
        mesa: true,
        mesero: true
      },
      orderBy: { creadaEn: 'desc' }
    });

    // 🔍 DIAGNÓSTICO: Imprimir la primera orden para ver si trae notaGeneral
    if (ordenesRaw.length > 0) {
        console.log(`🔍 LEYENDO BD - ID: ${ordenesRaw[0].id} | notaGeneral: "${ordenesRaw[0].notaGeneral}"`);
    }

    // ✅ TRANSFORMACIÓN PARA CAJA:
    return ordenesRaw.map(orden => {
        const nombreCliente = orden.notaGeneral || 'Cliente';
        let tituloCaja = '';

        if (orden.mesa) {
            tituloCaja = `Mesa ${orden.mesa.numero}`;
        } else {
            tituloCaja = `Pedido para llevar de ${nombreCliente}`;
        }

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
    return await this.prisma.orden.update({
      where: { id },
      data: { 
        estado: EstadoOrden.PAGADA,
        propina: datosPago?.propina || 0,
        metodoPago: datosPago?.metodoPago || 'Efectivo',
        cerradaEn: new Date()
      },
      include: { mesa: true }
    });
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
        mesero: true, mesa: true,
        items: { include: { producto: true } }
      }
    });
  }

  public async findByMesa(mesaId: number) {
      return this.prisma.orden.findMany({
        where: { mesaId, estado: { not: EstadoOrden.CANCELADA } },
        include: { items: { include: { producto: true } } }
      });
  }
}