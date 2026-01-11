import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { TurnosService } from './turnos.service';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Get()
  findAll() {
    return this.turnosService.findAll(1); // ID Sucursal 1
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