// pedidos.controller.ts - ORDEN DE RUTAS CORREGIDO

import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { EstadoOrden } from '@prisma/client';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // ===================================================
  // RUTAS CON PATHS ESPECÍFICOS (DEBEN IR PRIMERO)
  // ===================================================

  // ✅ 1. Obtener TODO lo del día
  @Get('dia')
  obtenerDelDia() {
    return this.pedidosService.obtenerOrdenesDelDia();
  }

  // ✅ 2. Obtener pedidos pendientes
  @Get('pendientes')
  findPendientes() {
    return this.pedidosService.findPendientes();
  }

  // ✅ 3. Obtener órdenes de una mesa
  @Get('mesa/:id')
  findByMesa(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.findByMesa(id);
  }

  // ✅ 4. Actualizar item individual (Barra/Cocina)
  @Patch('items/:itemId')
  actualizarItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('estado') estado: EstadoOrden 
  ) {
    console.log(`🧪 Actualizando ITEM ${itemId} a ${estado}`);
    return this.pedidosService.actualizarEstadoItem(itemId, estado);
  }

  // ===================================================
  // RUTAS DE ORDEN ESPECÍFICA (CON :id)
  // ===================================================

  // ✅ 5. Solicitar cuenta (DEBE IR ANTES DE @Get(':id'))
  @Patch(':id/solicitar-cuenta')
  solicitarCuenta(@Param('id', ParseIntPipe) id: number) {
    console.log(`💰 Solicitando cuenta para orden ${id}`);
    return this.pedidosService.solicitarCuenta(id);
  }

  // ✅ 6. Finalizar orden
  @Patch(':id/finalizar')
  finalizarOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() datosPago: any
  ) {
    console.log(`✅ Finalizando orden ${id}`, datosPago);
    return this.pedidosService.finalizarOrden(id, datosPago);
  }

  // ✅ 7. Cancelar orden
  @Patch(':id/cancelar')
  cancelarOrden(@Param('id', ParseIntPipe) id: number) {
    console.log(`❌ Cancelando orden ${id}`);
    return this.pedidosService.cancelarOrden(id);
  }

  // ✅ 8. Actualizar estado de orden (Soporta ambas rutas)
  @Patch(':id/estado')
  actualizarEstadoConRuta(
    @Param('id', ParseIntPipe) id: number, 
    @Body('estado') estado: EstadoOrden
  ) {
    console.log(`🔄 Actualizando ORDEN ${id} a estado: ${estado}`);
    return this.pedidosService.actualizarEstado(id, estado);
  }

  // Ruta alternativa sin /estado (para compatibilidad)
  @Patch(':id')
  actualizarEstadoDirecto(
    @Param('id', ParseIntPipe) id: number, 
    @Body('estado') estado: EstadoOrden
  ) {
    console.log(`🔄 [ALT] Actualizando ORDEN ${id} a estado: ${estado}`);
    return this.pedidosService.actualizarEstado(id, estado);
  }

  // ===================================================
  // RUTAS GENÉRICAS (DEBEN IR AL FINAL)
  // ===================================================

  // ✅ 9. Crear o actualizar orden
  @Post()
  create(@Body() createPedidoDto: any) {
    console.log('📥 Recibiendo pedido:', createPedidoDto);
    return this.pedidosService.create(createPedidoDto);
  }

  // ✅ 10. Obtener orden específica (DEBE IR AL FINAL)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    console.log(`📖 Obteniendo orden ${id}`);
    return this.pedidosService.obtenerOrdenCompleta(id);
  }

  // ✅ 11. Eliminar orden (REST estándar)
  @Delete(':id')
  eliminarOrden(@Param('id', ParseIntPipe) id: number) {
    console.log(`🗑️ Eliminando orden ${id}`);
    return this.pedidosService.cancelarOrden(id);
  }
}