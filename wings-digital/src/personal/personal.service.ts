import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // 👈 Asegúrate que esta ruta sea correcta

@Injectable()
export class PersonalService { // 👈 ¡TIENE QUE DECIR EXPORT!
  constructor(private prisma: PrismaService) {}

  // 1. Listar empleados activos
  async findAll(empresaId: number) {
    return this.prisma.empleado.findMany({
      where: { 
        empresaId: empresaId,
        activo: true 
      },
      orderBy: { nombre: 'asc' }
    });
  }

  // 2. Contratar
  async create(data: any) {
    return this.prisma.empleado.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: data.password, 
        rol: data.rol,
        empresaId: 1, // Ajustar según tu lógica de sesión
        sucursalId: 1,
        fechaContratacion: new Date()
      }
    });
  }

  // 3. Editar
  async update(id: number, data: any) {
    const datosActualizar: any = {
      nombre: data.nombre,
      email: data.email,
      rol: data.rol
    };

    if (data.password && data.password.trim() !== '') {
      datosActualizar.password = data.password;
    }

    return this.prisma.empleado.update({
      where: { id },
      data: datosActualizar
    });
  }

  // 4. Despedir
  async remove(id: number) {
    return this.prisma.empleado.update({
      where: { id },
      data: { activo: false }
    });
  }
}