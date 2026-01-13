import { Controller, Get, Post, Body, Patch, Param, Delete, Put, ParseIntPipe } from '@nestjs/common';
import { SucursalesService } from './sucursales.service';
// Asegúrate de importar tus DTOs si los usas, o usa 'any' si estás prototipando
// import { CreateSucursalDto } from './dto/create-sucursal.dto';
// import { UpdateSucursalDto } from './dto/update-sucursal.dto';

@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Get()
  findAll() {
    return this.sucursalesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.findOne(id);
  }

  @Post()
  create(@Body() createSucursalDto: any) {
    return this.sucursalesService.create(createSucursalDto);
  }

  // 👇 ESTO ES LO QUE TE FALTA (La ruta para Editar/Desactivar)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSucursalDto: any) {
    return this.sucursalesService.update(id, updateSucursalDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.remove(id);
  }
}