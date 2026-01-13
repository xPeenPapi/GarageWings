import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SucursalesService {
  constructor(private prisma: PrismaService) {}

  // 1. Listar todas las sucursales (con conteo de empleados opcional)
  async findAll() {
    return this.prisma.sucursal.findMany({
      where: { empresaId: 1 }, // Asumimos empresa 1
      include: {
        empleados: true, // Incluimos empleados para contarlos en el front si es necesario
      },
      orderBy: { nombre: 'asc' }
    });
  }

  // 2. Obtener una sucursal por ID
  async findOne(id: number) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
    });
    if (!sucursal) throw new NotFoundException(`Sucursal #${id} no encontrada`);
    return sucursal;
  }

  // 3. Crear nueva sucursal
  async create(data: any) {
    return this.prisma.sucursal.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        empresaId: 1, // Vinculado a la empresa principal
        activa: true
      }
    });
  }

  // 4. Actualizar Sucursal (¡ESTE FALTABA!)
  async update(id: number, data: any) {
    // Verificamos si existe primero
    await this.findOne(id);

    return this.prisma.sucursal.update({
      where: { id },
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
        // Si quisieras desactivarla sin borrarla:
        // activa: data.activa 
      },
    });
  }

  // 5. Eliminar Sucursal (Borrado en Cascada Seguro)
  async remove(id: number) {
    // Verificamos si existe
    await this.findOne(id);

    // PASO 1: Eliminar dependencias (Hijos)
    // Usamos una transacción para que si algo falla, no se borre nada a medias
    return this.prisma.$transaction(async (prisma) => {
      
      // A. Borrar Turnos asociados a empleados de esa sucursal
      // (Primero buscamos los empleados de la sucursal)
      const empleados = await prisma.empleado.findMany({
        where: { sucursalId: id },
        select: { id: true }
      });
      
      const empleadoIds = empleados.map(e => e.id);

      if (empleadoIds.length > 0) {
        // Borramos turnos de esos empleados
        await prisma.turno.deleteMany({
          where: { empleadoId: { in: empleadoIds } }
        });
      }

      // B. Borrar Empleados
      await prisma.empleado.deleteMany({ where: { sucursalId: id } });

      // C. Borrar Mesas
      await prisma.mesa.deleteMany({ where: { sucursalId: id } });

      // D. Borrar Productos/Stock (Si tuvieras inventario por sucursal)
      // await prisma.stock.deleteMany({ where: { sucursalId: id } });

      // PASO 2: Finalmente eliminar la Sucursal
      return prisma.sucursal.delete({
        where: { id },
      });
    });
  }
}