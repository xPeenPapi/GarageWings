import { Controller, Get, Patch, Param, Body, ParseIntPipe, Post } from '@nestjs/common';
import { MesaService } from './mesa.service';

@Controller('mesas')
export class MesasController {
  constructor(private mesasService: MesaService) {}

  @Get()
  findAll() {
    return this.mesasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mesasService.findOne(id);
  }

  @Patch(':id/estado')
  actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any
  ) {
    // Delegamos la lógica al servicio para evitar el error "property prisma does not exist"
    return this.mesasService.actualizarEstadoMesa(id, updateData);
  }

  @Post('transferir')
  transferirMesa(@Body() body: { origenId: number; destinoId: number }) {
    return this.mesasService.transferirMesa(body.origenId, body.destinoId);
  }
}