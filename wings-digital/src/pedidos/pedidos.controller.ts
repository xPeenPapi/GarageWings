import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { EstadoOrden } from '@prisma/client';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  // ✅ 1. Crear o actualizar orden
  @Post()
  create(@Body() createPedidoDto: any) {
    console.log('📥 Recibiendo pedido:', createPedidoDto);
    return this.pedidosService.create(createPedidoDto);
  }

  // ✅ 2. Obtener TODO lo del día
  @Get('dia')
  obtenerDelDia() {
    return this.pedidosService.obtenerOrdenesDelDia();
  }

  // ✅ 3. Obtener pedidos pendientes
  @Get('pendientes')
  findPendientes() {
    // console.log('🔍 Consultando pedidos pendientes...');
    return this.pedidosService.findPendientes();
  }

  // ✅ 4. Obtener órdenes de una mesa
  @Get('mesa/:id')
  findByMesa(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.findByMesa(id);
  }

  // ✅ 5. Obtener orden específica
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.obtenerOrdenCompleta(id);
  }

  // ✅ 6. Actualizar estado (DE LA ORDEN COMPLETA)
  @Patch(':id/estado')
  actualizarEstado(
    @Param('id', ParseIntPipe) id: number, 
    @Body('estado') estado: EstadoOrden
  ) {
    console.log(`🔄 Actualizando ORDEN ${id} a estado: ${estado}`);
    return this.pedidosService.actualizarEstado(id, estado);
  }

  // ✅ 7. Solicitar cuenta
  @Patch(':id/solicitar-cuenta')
  solicitarCuenta(@Param('id', ParseIntPipe) id: number) {
    console.log(`💰 Solicitando cuenta para orden ${id}`);
    return this.pedidosService.solicitarCuenta(id);
  }

  // ✅ 8. Finalizar orden
  @Patch(':id/finalizar')
  finalizarOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() datosPago: any
  ) {
    console.log(`✅ Finalizando orden ${id}`, datosPago);
    return this.pedidosService.finalizarOrden(id, datosPago);
  }

  // ✅ 9. Cancelar orden
  @Patch(':id/cancelar')
  cancelarOrden(@Param('id', ParseIntPipe) id: number) {
    console.log(`❌ Cancelando orden ${id}`);
    return this.pedidosService.cancelarOrden(id);
  }

  // =======================================================
  // 🔥 NUEVO: ACTUALIZAR ITEM INDIVIDUAL (Barra/Cocina)
  // =======================================================
  @Patch('items/:itemId')
  actualizarItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('estado') estado: EstadoOrden 
  ) {
    console.log(`🧪 Actualizando ITEM ${itemId} a ${estado}`);
    return this.pedidosService.actualizarEstadoItem(itemId, estado);
  }
}