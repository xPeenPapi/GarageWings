import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoOrden } from '@prisma/client';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async obtenerDashboardGerente(empresaId: number) {
    // Rango de fechas amplio para evitar problemas de zona horaria
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);
    // hoyInicio.setDate(hoyInicio.getDate() - 1); // Descomenta si crees que es por horario UTC

    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);
    // hoyFin.setDate(hoyFin.getDate() + 1);

    // 1. Personal Activo
    const personalActivo = await this.prisma.empleado.count({
      where: {
        activo: true,
        enVacaciones: false
      }
    });

    // 2. Órdenes PAGADAS (Incluyendo los items para recalcular si es necesario)
    const ordenesDelDia = await this.prisma.orden.findMany({
      where: {
        estado: EstadoOrden.PAGADA,
        creadaEn: { gte: hoyInicio, lte: hoyFin }
      },
      include: {
        items: true // 👈 IMPORTANTE: Traemos los platillos para sumar precios
      }
    });

    // 3. Cálculos
    let ventasTotales = 0;
    let efectivo = 0;
    let tarjeta = 0;
    let transferencia = 0;

    ordenesDelDia.forEach(orden => {
        // A. Intentamos usar el total guardado
        let montoOrden = Number(orden.total) || 0;

        // B. SI ES 0 (El error actual), lo calculamos sumando los items manualmente
        if (montoOrden === 0 && orden.items && orden.items.length > 0) {
            console.log(`⚠️ Orden #${orden.id} tiene total 0. Recalculando desde items...`);
            montoOrden = orden.items.reduce((acc, item) => {
                return acc + (Number(item.precioUnitario) * item.cantidad);
            }, 0);
        }

        console.log(`💰 Orden #${orden.id}: $${montoOrden}`);
        ventasTotales += montoOrden;

        // Clasificar por método de pago
        const metodo = (orden.metodoPago || '').toLowerCase();
        if (metodo.includes('efectivo')) efectivo += montoOrden;
        else if (metodo.includes('tarjeta')) tarjeta += montoOrden;
        else if (metodo.includes('transferencia')) transferencia += montoOrden;
        else efectivo += montoOrden; 
    });

    const ordenesTotales = ordenesDelDia.length;
    const ticketPromedio = ordenesTotales > 0 ? (ventasTotales / ordenesTotales) : 0;

    return {
        ventasTotales,
        ordenesTotales,
        personalActivo,
        ticketPromedio,
        resumenPago: {
            efectivo,
            tarjeta,
            transferencia
        },
        totalGeneral: ventasTotales
    };
  }
}