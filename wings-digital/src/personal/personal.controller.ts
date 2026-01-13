import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, HttpException, HttpStatus } from '@nestjs/common';
import { PersonalService } from './personal.service';

@Controller('personal')
export class PersonalController {
  constructor(private readonly personalService: PersonalService) {}

  @Get()
  findAll() {
    const empresaId = 1; // Hardcodeado por ahora
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
        sucursalId: sucursalId // ✅ Usar el que viene del frontend
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