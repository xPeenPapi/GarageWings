import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalService {
  constructor(private prisma: PrismaService) {}

  // 1. Listar empleados (Filtrado por empresa)
  async findAll(empresaId: number) {
    return this.prisma.empleado.findMany({
      where: { empresaId },
      include: {
        sucursal: true
      },
      orderBy: { nombre: 'asc' }
    });
  }

  // 2. Crear Empleado (Con validación de Gerente Único)
  async create(data: any) {
    const { nombre, email, password, rol, sucursalId, empresaId } = data;

    // ✅ Validaciones básicas
    if (!nombre || !email || !password || !rol || !sucursalId) {
      throw new HttpException('Datos incompletos', HttpStatus.BAD_REQUEST);
    }

    // ✅ VALIDACIÓN DE GERENTE ÚNICO POR SUCURSAL
    if (rol === 'GERENTE') {
      const gerenteExistente = await this.prisma.empleado.findFirst({
        where: {
          sucursalId: Number(sucursalId),
          rol: 'GERENTE',
          activo: true
        }
      });

      if (gerenteExistente) {
        throw new HttpException(
          `La sucursal ya tiene un Gerente activo (${gerenteExistente.nombre}). No se puede asignar otro.`,
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // ✅ Verificar si el email ya existe
    const emailExistente = await this.prisma.empleado.findUnique({
      where: { email }
    });

    if (emailExistente) {
      throw new HttpException('El email ya está registrado', HttpStatus.CONFLICT);
    }

    // ✅ Crear empleado (contraseña sin encriptar, según tu código actual)
    const nuevoEmpleado = await this.prisma.empleado.create({
      data: {
        nombre,
        email,
        password, 
        rol,
        sucursalId: Number(sucursalId),
        empresaId: Number(empresaId),
        activo: true
      },
      include: {
        sucursal: true
      }
    });

    return {
      success: true,
      message: 'Empleado creado exitosamente',
      empleado: nuevoEmpleado
    };
  }

  // 3. Actualizar Empleado
  async update(id: number, data: any) {
    return this.prisma.empleado.update({
      where: { id },
      data,
      include: {
        sucursal: true
      }
    });
  }

  // 4. Eliminar (Soft Delete)
  async remove(id: number) {
    return this.prisma.empleado.update({
      where: { id },
      data: { activo: false }
    });
  }

  // ==========================================================
  // ✅ NUEVO MÉTODO: Estadísticas del Dashboard
  // ==========================================================
  async getDashboardStats(sucursalId: number | null) {
    
    // Si sucursalId es null (es Admin), el whereClause queda vacío y trae todo.
    // Si sucursalId tiene número (es Gerente), filtra por esa sucursal a través de mesa.
    const whereClause = sucursalId ? {
      mesa: {
        sucursalId: Number(sucursalId)
      }
    } : {};

    // A. Total Ventas (Suma del total de órdenes)
    const ventasAgg = await this.prisma.orden.aggregate({
      _sum: { total: true },
      where: whereClause
    });
    const ventasTotales = Number(ventasAgg._sum?.total || 0);

    // B. Total Órdenes (Conteo)
    const totalOrdenes = await this.prisma.orden.count({
      where: whereClause
    });

    // C. Personal Activo (Conteo)
    const whereClauseEmpleado = sucursalId ? { sucursalId: Number(sucursalId) } : {};
    const personalActivo = await this.prisma.empleado.count({
      where: {
        ...whereClauseEmpleado,
        activo: true
      }
    });

    // D. Ticket Promedio
    const ticketPromedio = totalOrdenes > 0 ? (ventasTotales / totalOrdenes) : 0;

    // E. Datos para Gráfica de Roles
    // Traemos todos los empleados (filtrados por sucursal) para contarlos en JS
    const empleados = await this.prisma.empleado.findMany({
      where: whereClauseEmpleado,
      select: { rol: true }
    });

    const roles = {
      meseros: empleados.filter(e => e.rol === 'MESERO').length,
      cocina: empleados.filter(e => e.rol === 'COCINA').length,
      barra: empleados.filter(e => e.rol === 'BARRA').length,
      caja: empleados.filter(e => e.rol === 'CAJA').length,
      gerentes: empleados.filter(e => e.rol === 'GERENTE').length,
    };

    // Retornamos el objeto listo para el Frontend
    return {
      ventasTotales,
      ordenesTotales: totalOrdenes,
      personalActivo,
      ticketPromedio,
      roles
    };
  }
}