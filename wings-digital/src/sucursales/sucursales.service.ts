import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SucursalesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.sucursal.findMany({
      where: { empresaId: 1 },
      include: { empleados: true },
      orderBy: { nombre: 'asc' }
    });
  }

  async findOne(id: number) {
    const sucursal = await this.prisma.sucursal.findUnique({ where: { id } });
    if (!sucursal) throw new NotFoundException(`Sucursal #${id} no encontrada`);
    return sucursal;
  }

  async create(data: any) {
    // 1. Crear la sucursal
    const nuevaSucursal = await this.prisma.sucursal.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        empresaId: 1, 
        activa: true // Por defecto nace activa
      }
    });

    // 2. ✅ AUTO-CREAR MESAS POR DEFECTO (configurable)
    const cantidadMesasPorDefecto = data.cantidadMesas || 12; // Default: 12 mesas
    const mesasACrear = [];

    for (let i = 1; i <= cantidadMesasPorDefecto; i++) {
      mesasACrear.push({
        numero: `M${i}`,
        capacidad: i <= 8 ? 4 : 2, // Primeras 8 son de 4 personas, resto de 2
        tipo: i <= 8 ? 'cuadrada' : 'rectangular',
        estado: 'DISPONIBLE',
        posX: i <= 8 ? (i - 1) * 150 : (i - 9) * 150,
        posY: i <= 8 ? 50 : 250,
        sucursalId: nuevaSucursal.id
      });
    }

    // Crear todas las mesas en batch
    await this.prisma.mesa.createMany({
      data: mesasACrear
    });

    console.log(`✅ Sucursal "${nuevaSucursal.nombre}" creada con ${cantidadMesasPorDefecto} mesas`);

    return nuevaSucursal;
  }

  // ✅ ACTUALIZADO: Ahora permite recibir 'activa' en el body
async update(id: number, data: any) {
    // 1. Verificar si existe
    const existe = await this.prisma.sucursal.findUnique({ where: { id } });
    if (!existe) throw new NotFoundException(`Sucursal #${id} no encontrada`);

    // 2. Actualizar
    return this.prisma.sucursal.update({
      where: { id },
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        // 👇 IMPORTANTE: Esto permite que el switch de activar/desactivar funcione
        activa: data.activa 
      },
    });
  }

  // Dejamos el remove por si algún día logras limpiar las referencias, 
  // pero el frontend usará update para desactivar.
  async remove(id: number) {
     /* ... código de borrado en cascada anterior ... */
     return this.prisma.sucursal.delete({ where: { id } });
  }
}