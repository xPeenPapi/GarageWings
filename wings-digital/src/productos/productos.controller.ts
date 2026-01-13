
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { JwtAuthGuard } from '../auth/jwd.guard';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  create(@Body() createProductoDto: any) {
    return this.productosService.create(createProductoDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req) {
    const rol = req.user?.rol;
    
    // ✅ ROLES OPERATIVOS (Mesero, Cocina, Barra, Caja): Ver TODOS los productos activos
    // Los productos son globales para la empresa, no se filtran por sucursal
    // Solo se filtran por sucursal en el dashboard del GERENTE para configuración
    
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
update(@Param('id', ParseIntPipe) id: number, @Body() updateData: any) {
  return this.productosService.update(id, updateData);
}
}


