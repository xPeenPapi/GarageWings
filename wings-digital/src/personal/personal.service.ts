import { Injectable, BadRequestException } from '@nestjs/common'; // 👈 Importamos BadRequestException
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
      include: {
        sucursal: {
          select: { nombre: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });
  }

  // 2. Contratar (Crear Empleado con Validación)
  async create(data: any) {
    
    // ✅ VALIDACIÓN DE SEGURIDAD: UN SOLO GERENTE POR SUCURSAL
    if (data.rol === 'GERENTE' && data.sucursalId) {
      const sucursalId = Number(data.sucursalId);

      const gerenteExistente = await this.prisma.empleado.findFirst({
        where: {
          sucursalId: sucursalId,
          rol: 'GERENTE',
          activo: true // Solo nos importa si está activo
        }
      });

      if (gerenteExistente) {
        // Obtenemos el nombre de la sucursal para que el error sea claro
        const sucursal = await this.prisma.sucursal.findUnique({ where: { id: sucursalId }});
        throw new BadRequestException(`La sucursal "${sucursal?.nombre}" ya tiene un Gerente activo (${gerenteExistente.nombre}). No se puede crear otro.`);
      }
    }

    // Si pasa la validación, creamos el empleado
    return this.prisma.empleado.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: data.password, 
        rol: data.rol,
        empresaId: 1, 
        sucursalId: data.sucursalId ? Number(data.sucursalId) : null,
        fechaContratacion: new Date(),
        activo: true
      }
    });
  }

  // 3. Modificar
  async update(id: number, data: any) {
    
    // ✅ VALIDACIÓN EN EDICIÓN TAMBIÉN (Por si intentan promover a alguien a Gerente)
    if (data.rol === 'GERENTE' && data.sucursalId) {
      const sucursalId = Number(data.sucursalId);
      
      const gerenteExistente = await this.prisma.empleado.findFirst({
        where: {
          sucursalId: sucursalId,
          rol: 'GERENTE',
          activo: true,
          id: { not: id } // Importante: Excluir al empleado que estamos editando
        }
      });

      if (gerenteExistente) {
        throw new BadRequestException(`Ya existe otro Gerente en esta sucursal.`);
      }
    }

    const datosParaActualizar: any = {
      nombre: data.nombre,
      email: data.email,
      rol: data.rol
    };

    if (data.sucursalId) {
      datosParaActualizar.sucursalId = Number(data.sucursalId);
    }

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