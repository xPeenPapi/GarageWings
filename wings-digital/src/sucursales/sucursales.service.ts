import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SucursalesService {
  constructor(private prisma: PrismaService) {}

  // 1. Listar todas las sucursales
  async findAll() {
    return this.prisma.sucursal.findMany({
      where: { empresaId: 1 }, // Asumimos empresa 1
      include: {
        empleados: true, 
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
        empresaId: 1, 
        activa: true
      }
    });
  }

  // 4. Actualizar Sucursal
  async update(id: number, data: any) {
    await this.findOne(id); // Verificar existencia

    return this.prisma.sucursal.update({
      where: { id },
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        telefono: data.telefono,
      },
    });
  }

  // 5. Eliminar Sucursal (Borrado en Cascada Completo)
  async remove(id: number) {
    // Verificar que exista antes de intentar borrar
    await this.findOne(id);

    // Usamos transacción para borrar TODO o NADA
    return this.prisma.$transaction(async (tx) => {
      
      // A. Borrar Órdenes/Ventas vinculadas a la sucursal
      // IMPORTANTE: Esto soluciona el bloqueo por Foreign Key en Ventas
      // Si tu modelo se llama 'Venta' o 'Pedido', cambia 'orden' por ese nombre.
      try {
        // @ts-ignore: Ignoramos error de tipo por si el modelo se llama diferente
        if (tx.orden) await tx.orden.deleteMany({ where: { sucursalId: id } });
      } catch (e) {
        console.log('No se encontraron órdenes para borrar o el modelo difiere', e);
      }

      // B. Obtener empleados para borrar sus dependencias (Turnos)
      const empleados = await tx.empleado.findMany({
        where: { sucursalId: id },
        select: { id: true }
      });
      const empleadoIds = empleados.map(e => e.id);

      if (empleadoIds.length > 0) {
         // Borrar turnos de los empleados
         await tx.turno.deleteMany({ where: { empleadoId: { in: empleadoIds } } });
      }

      // C. Borrar Empleados
      await tx.empleado.deleteMany({ where: { sucursalId: id } });

      // D. Borrar Mesas
      await tx.mesa.deleteMany({ where: { sucursalId: id } });
      
      // E. (Opcional) Borrar Productos si están ligados exclusivamente a la sucursal
      // await tx.producto.deleteMany({ where: { sucursalId: id } });

      // F. Finalmente, borrar la Sucursal
      return tx.sucursal.delete({
        where: { id },
      });
    });
  }
}