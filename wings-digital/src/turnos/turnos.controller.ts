import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { JwtAuthGuard } from '../auth/jwd.guard';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req) {
    const sucursalId = req.user?.sucursalId;
    const rol = req.user?.rol;
    
    // Si es ADMIN, devolver todos los turnos (empresaId 1)
    if (rol === 'ADMIN_EMPRESA' || rol === 'SUPER_ADMIN') {
      return this.turnosService.findAll(1);
    }
    
    // Para GERENTE u otros roles, filtrar por su sucursal
    return this.turnosService.findAll(Number(sucursalId));
  }

  @Post()
  create(@Body() data: any) {
    return this.turnosService.create(data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.remove(id);
  }
}