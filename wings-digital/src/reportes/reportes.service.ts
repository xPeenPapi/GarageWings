import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// Asegúrate de importar esto si usas el enum, o usa el string 'PAGADA' directamente
import { EstadoOrden } from '@prisma/client'; 

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  // 👇 Aceptamos la fecha como string opcional (YYYY-MM-DD)
  async getDashboardData(fechaString?: string) {
    
    // 1. Configurar Fechas (Inicio y Fin del día)
    let fechaBase = new Date();

    if (fechaString) {
      // Si recibimos "2023-10-25", le agregamos la hora para asegurar el día local
      // Ojo: split para evitar problemas de zona horaria con new Date("YYYY-MM-DD")
      const [year, month, day] = fechaString.split('-').map(Number);
      fechaBase = new Date(year, month - 1, day); // Mes es base 0 en JS
    }

    const inicioDia = new Date(fechaBase);
    inicioDia.setHours(0, 0, 0, 0);

    const finDia = new Date(fechaBase);
    finDia.setHours(23, 59, 59, 999);

    console.log(`📊 Generando reporte desde ${inicioDia.toLocaleString()} hasta ${finDia.toLocaleString()}`);

    // 2. Personal Activo (Esto siempre es "en el momento", no histórico)
    const personalActivo = await this.prisma.empleado.count({
      where: {
        activo: true,
        // enVacaciones: false // Descomenta si tienes este campo
      }
    });

    // 3. Órdenes del Rango de Fechas
    const ordenesDelDia = await this.prisma.orden.findMany({
      where: {
        // Filtramos solo las pagadas/cerradas
        estado: { in: ['PAGADA', 'ENTREGADA', 'CERRADA'] }, 
        creadaEn: { 
          gte: inicioDia, 
          lte: finDia 
        }
      },
      include: {
        items: true, // Importante para tu recálculo manual
        pagos: true  // Si tienes una tabla de pagos separada, si no, usa metodoPago de la orden
      }
    });

    // 4. Cálculos y Acumuladores
    let ventasTotales = 0;
    let efectivo = 0;
    let tarjeta = 0;
    let transferencia = 0;

    ordenesDelDia.forEach(orden => {
        // A. Intentamos usar el total guardado
        let montoOrden = Number(orden.total) || 0;

        // B. TU CORRECCIÓN: Si es 0, recalculamos sumando items
        if (montoOrden === 0 && orden.items && orden.items.length > 0) {
            // console.log(`⚠️ Orden #${orden.id} tiene total 0. Recalculando...`);
            montoOrden = orden.items.reduce((acc, item) => {
                return acc + (Number(item.precioUnitario) * item.cantidad);
            }, 0);
        }

        ventasTotales += montoOrden;

        // C. Clasificar por método de pago
        // Si tienes tabla 'pagos', úsala. Si es un campo simple 'metodoPago':
        const metodo = (orden.metodoPago || '').toLowerCase();
        
        if (metodo.includes('efectivo')) {
            efectivo += montoOrden;
        } else if (metodo.includes('tarjeta') || metodo.includes('debito') || metodo.includes('credito')) {
            tarjeta += montoOrden;
        } else if (metodo.includes('transferencia')) {
            transferencia += montoOrden;
        } else {
            // Si es mixto o no definido, por defecto lo sumamos a efectivo o creamos 'otros'
            efectivo += montoOrden; 
        }
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