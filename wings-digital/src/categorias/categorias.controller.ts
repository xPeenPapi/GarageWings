import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { CategoriasService } from './categorias.service';

@Controller('categorias') // Esto define la ruta /api/categorias
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  findAll() {
    return this.categoriasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.findOne(id);
  }

  @Post()
  create(@Body() createData: any) {
    return this.categoriasService.create(createData);
  }

  // ✅ ESTA ES LA RUTA QUE SOLUCIONA TU ERROR 404
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateData: any
  ) {
    console.log(`🔄 Actualizando categoría ${id}:`, updateData);
    return this.categoriasService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.remove(id);
  }
}