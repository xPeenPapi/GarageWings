import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
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
  create(@Body() data: any) {
    // Aseguramos que se cree en la empresa 1
    return this.personalService.create({ ...data, empresaId: 1, sucursalId: 1 });
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