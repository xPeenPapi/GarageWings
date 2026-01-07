import { Controller, Get, Patch, Param, Body, ParseIntPipe, Post } from '@nestjs/common';
import { MesaService } from './mesa.service';
import { EstadoMesa } from '@prisma/client';

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
    @Body('estado') estado: EstadoMesa,
  ) {
    return this.mesasService.actualizarEstado(id, estado);
  }

  // ✅ ESTO ES LO QUE FALTABA:
  @Post('transferir')
  transferirMesa(@Body() body: { origenId: number; destinoId: number }) {
    return this.mesasService.transferirMesa(body.origenId, body.destinoId);
  }
}