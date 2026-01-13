
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

  @Get('categorias')
  findAllCategorias() {
    return this.productosService.findAllCategorias();
  }

  // ✅ NUEVO: Endpoint para adicionales
  @Get('adicionales')
  getAdicionales() {
    return this.productosService.getAdicionales();
  }

  @Get('categoria/:id')
  findByCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findByCategoria(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.findOne(id);
  }

@Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateData: any // Recibe { activo: false }
  ) {
    return this.productosService.update(id, updateData);
  }
}


