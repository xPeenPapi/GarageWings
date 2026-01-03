import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ProductosService } from './productos.service';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  create(@Body() createProductoDto: any) {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  findAll() {
    return this.productosService.findAll();
  }

  // ⚠️ IMPORTANTE: Esta ruta debe ir ANTES de @Get(':id')
  // Si la pones después, NestJS pensará que "categorias" es un ID y fallará.
  @Get('categorias')
  findAllCategorias() {
    return this.productosService.findAllCategorias();
  }

  @Get('categoria/:id')
  findByCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findByCategoria(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id);
  }
}