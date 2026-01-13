
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
    const sucursalId = req.user?.sucursalId;
    const rol = req.user?.rol;
    
    // Si es ADMIN, devolver todos los productos
    if (rol === 'ADMIN_EMPRESA' || rol === 'SUPER_ADMIN') {
      return this.productosService.findAll();
    }
    
    // Para GERENTE u otros roles, filtrar por su sucursal
    return this.productosService.findBySucursal(Number(sucursalId));
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


