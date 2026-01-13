import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoOrden } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class PrediccionesService {
  constructor(private prisma: PrismaService) {}

  async generarPrediccionVentas(sucursalId: number) {
    // 1. Obtener ventas de los últimos 7 días
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);

    const ventasSemana = await this.prisma.orden.findMany({
      where: {
        sucursalId: sucursalId,
        estado: EstadoOrden.PAGADA,
        cerradaEn: { gte: hace7Dias }
      },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      },
      orderBy: { cerradaEn: 'asc' }
    });

    // 2. Procesar datos por día
    const ventasPorDia = this.agruparVentasPorDia(ventasSemana);
    const productosPopulares = this.obtenerProductosPopulares(ventasSemana);
    const promedioTicket = this.calcularPromedioTicket(ventasSemana);
    const totalVentas = ventasSemana.reduce((sum, orden) => {
      return sum + orden.items.reduce((itemSum, item) => 
        itemSum + (Number(item.precioUnitario) * item.cantidad), 0
      );
    }, 0);

    // 3. Preparar prompt para OpenRouter
    const prompt = this.construirPrompt(ventasPorDia, productosPopulares, promedioTicket, totalVentas);

    // 4. Llamar a OpenRouter
    try {
      const prediccion = await this.llamarOpenRouter(prompt);
      
      return {
        success: true,
        datos: {
          totalVentas,
          totalOrdenes: ventasSemana.length,
          promedioTicket,
          ventasPorDia,
          productosPopulares: productosPopulares.slice(0, 5)
        },
        prediccion
      };
    } catch (error) {
      console.error('❌ Error al obtener predicción:', error);
      
      // Extraer mensaje de error específico
      let mensajeError = 'No se pudo generar la predicción';
      if (error.response) {
        // Error de la API de OpenRouter
        mensajeError = `Error ${error.response.status}: ${error.response.data?.error?.message || 'Error en la API'}`;
        console.error('📡 Respuesta de error:', error.response.data);
      } else if (error.message) {
        mensajeError = error.message;
      }
      
      return {
        success: false,
        error: mensajeError,
        datos: {
          totalVentas,
          totalOrdenes: ventasSemana.length,
          promedioTicket,
          ventasPorDia,
          productosPopulares: productosPopulares.slice(0, 5)
        }
      };
    }
  }

  private agruparVentasPorDia(ordenes: any[]) {
    const resultado: any = {};
    
    ordenes.forEach(orden => {
      const fecha = new Date(orden.cerradaEn).toLocaleDateString('es-MX', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      const total = orden.items.reduce((sum, item) => 
        sum + (Number(item.precioUnitario) * item.cantidad), 0
      );
      
      if (!resultado[fecha]) {
        resultado[fecha] = { ventas: 0, ordenes: 0 };
      }
      
      resultado[fecha].ventas += total;
      resultado[fecha].ordenes += 1;
    });
    
    return resultado;
  }

  private obtenerProductosPopulares(ordenes: any[]) {
    const conteo: any = {};
    
    ordenes.forEach(orden => {
      orden.items.forEach(item => {
        const nombre = item.producto.nombre;
        if (!conteo[nombre]) {
          conteo[nombre] = { cantidad: 0, ingresos: 0 };
        }
        conteo[nombre].cantidad += item.cantidad;
        conteo[nombre].ingresos += Number(item.precioUnitario) * item.cantidad;
      });
    });
    
    return Object.entries(conteo)
      .map(([nombre, datos]: [string, any]) => ({
        nombre,
        cantidad: datos.cantidad,
        ingresos: datos.ingresos
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private calcularPromedioTicket(ordenes: any[]) {
    if (ordenes.length === 0) return 0;
    
    const total = ordenes.reduce((sum, orden) => {
      return sum + orden.items.reduce((itemSum, item) => 
        itemSum + (Number(item.precioUnitario) * item.cantidad), 0
      );
    }, 0);
    
    return total / ordenes.length;
  }

  private construirPrompt(ventasPorDia: any, productosPopulares: any[], promedioTicket: number, totalVentas: number) {
    return `Eres un experto analista de datos para restaurantes. Analiza las siguientes ventas de la última semana y proporciona una predicción detallada y recomendaciones estratégicas.

DATOS DE LA SEMANA:
${Object.entries(ventasPorDia).map(([dia, datos]: [string, any]) => 
  `- ${dia}: $${datos.ventas.toFixed(2)} en ${datos.ordenes} órdenes`
).join('\n')}

TOTAL SEMANAL: $${totalVentas.toFixed(2)}
TICKET PROMEDIO: $${promedioTicket.toFixed(2)}

TOP 5 PRODUCTOS MÁS VENDIDOS:
${productosPopulares.slice(0, 5).map((p, i) => 
  `${i + 1}. ${p.nombre}: ${p.cantidad} unidades ($${p.ingresos.toFixed(2)})`
).join('\n')}

Por favor proporciona:
1. 📊 Análisis de tendencias (días más fuertes, patrones detectados)
2. 🎯 Predicción de ventas para la próxima semana (con rango estimado)
3. 💡 3 recomendaciones estratégicas específicas para aumentar ventas
4. ⚠️ Alertas o puntos de atención

Sé conciso, profesional y enfocado en acciones prácticas. Usa formato markdown con emojis.`;
  }

  private async llamarOpenRouter(prompt: string) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    
    console.log('🔑 API KEY presente:', !!OPENROUTER_API_KEY);
    console.log('🔑 Primeros 15 chars:', OPENROUTER_API_KEY?.substring(0, 15));
    
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.includes('REEMPLAZA')) {
      throw new Error('API Key de OpenRouter no configurada. Configura OPENROUTER_API_KEY en el archivo .env');
    }
    
    console.log('📤 Enviando petición a OpenRouter...');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://garagewings.app',
          'X-Title': 'Garage Wings - Predicción de Ventas',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Respuesta recibida de OpenRouter');
    return response.data.choices[0].message.content;
  }
}
