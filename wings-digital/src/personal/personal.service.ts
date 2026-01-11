import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalService {
  constructor(private prisma: PrismaService) {}

  // 1. Listar empleados (Activos)
  async findAll(empresaId: number) {
    return this.prisma.empleado.findMany({
      where: { 
        empresaId: empresaId,
        activo: true 
      },
      // 👇 AGREGADO: Traemos datos de la sucursal para saber dónde están
      include: {
        sucursal: {
          select: { nombre: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });
  }

  // 2. Contratar (Crear Empleado)
  async create(data: any) {
    return this.prisma.empleado.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: data.password, 
        rol: data.rol,
        empresaId: 1, // Empresa fija por ahora
        
        // 👇 ACTUALIZADO: Asignamos la sucursal que elegiste en el modal
        sucursalId: data.sucursalId ? Number(data.sucursalId) : null,
        
        fechaContratacion: new Date()
      }
    });
  }

  // 3. Modificar (Editar datos, password o cambiar de sucursal)
  async update(id: number, data: any) {
    const datosParaActualizar: any = {
      nombre: data.nombre,
      email: data.email,
      rol: data.rol
    };

    // Si nos mandan sucursal, la actualizamos (Transferencia de empleado)
    if (data.sucursalId) {
      datosParaActualizar.sucursalId = Number(data.sucursalId);
    }

    // Solo actualizamos la contraseña si el usuario escribió una nueva
    if (data.password && data.password.trim() !== '') {
      datosParaActualizar.password = data.password;
    }

    return this.prisma.empleado.update({
      where: { id },
      data: datosParaActualizar
    });
  }

  // 4. Despedir (Soft Delete)
  async remove(id: number) {
    return this.prisma.empleado.update({
      where: { id },
      data: { activo: false }
    });
  }
}