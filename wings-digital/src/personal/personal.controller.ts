import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { PersonalService } from './personal.service';
import { JwtAuthGuard } from '../auth/jwd.guard'; // 👈 Asegúrate que la ruta sea correcta

@Controller('personal')
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  // ✅ NUEVO ENDPOINT PARA EL DASHBOARD FILTRADO
  @UseGuards(JwtAuthGuard) // 🔒 Protegemos para leer el token
  @Get('dashboard')
  async getDashboard(@Req() req) {
    
    // 1. Extraemos datos del usuario logueado
    const sucursalId = req.user.sucursalId;
    const rol = req.user.rol;

    // 2. Definimos el filtro:
    // - Si es ADMIN, enviamos null (ver todo).
    // - Si es GERENTE (o cualquier otro), enviamos su sucursalId.
    const idParaFiltrar = rol === 'ADMIN' ? null : sucursalId;

    console.log(`📊 Dashboard solicitado por: ${req.user.email} (${rol}) - Filtro Sucursal ID: ${idParaFiltrar}`);

    // 3. Llamamos al servicio con el filtro
    return this.personalService.getDashboardStats(idParaFiltrar);
  }

  // --- TUS MÉTODOS EXISTENTES (SIN CAMBIOS) ---

  @Get()
  findAll() {
    const empresaId = 1; 
    return this.personalService.findAll(empresaId);
  }

  @Post()
  async create(@Body() data: any) {
    try {
      // ✅ VALIDAR que venga sucursalId
      if (!data.sucursalId) {
        throw new HttpException('Debe especificar una sucursal', HttpStatus.BAD_REQUEST);
      }

      // ✅ Convertir a número por seguridad
      const sucursalId = Number(data.sucursalId);
      
      // ✅ NO SOBRESCRIBIR el sucursalId que viene del frontend
      return this.personalService.create({ 
        ...data, 
        empresaId: 1, 
        sucursalId: sucursalId 
      });
      
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Error al crear empleado',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.personalService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.personalService.remove(id);
  }
}