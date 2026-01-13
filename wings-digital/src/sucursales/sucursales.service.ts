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
    // Primero verificamos que la sucursal exista
    const sucursalExiste = await this.prisma.sucursal.findUnique({ where: { id } });
    if (!sucursalExiste) {
        throw new NotFoundException(`La sucursal ${id} no existe.`);
    }

    // Usamos una transacción: O se borra TODO, o no se borra NADA.
    return this.prisma.$transaction(async (tx) => {
      // 1. Borrar Turnos asociados a empleados de esta sucursal
      // Primero encontramos los IDs de los empleados
      const empleados = await tx.empleado.findMany({
        where: { sucursalId: id },
        select: { id: true }
      });
      const empleadoIds = empleados.map(e => e.id);

      if (empleadoIds.length > 0) {
         // Borramos sus turnos, asistencias, etc.
         await tx.turno.deleteMany({ where: { empleadoId: { in: empleadoIds } } });
         // Si tienes tabla de Ventas o Comandas vinculadas a empleados, bórralas aquí también.
      }

      // 2. Borrar Empleados de la sucursal
      await tx.empleado.deleteMany({ where: { sucursalId: id } });

      // 3. Borrar Mesas de la sucursal
      await tx.mesa.deleteMany({ where: { sucursalId: id } });
      
      // 4. Borrar Productos si están ligados a sucursal (Opcional, depende tu modelo)
      // await tx.producto.deleteMany({ where: { sucursalId: id } });

      // 5. Finalmente, borrar la Sucursal
      return tx.sucursal.delete({
        where: { id },
      });
    });
  }
}