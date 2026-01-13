import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwd.guard';
import { PrediccionesService } from './predicciones.service';
import dotenv from 'dotenv';
dotenv.config();

@Controller('predicciones')
@UseGuards(JwtAuthGuard)
export class PrediccionesController {
  constructor(private readonly prediccionesService: PrediccionesService) {}

  @Get('ventas-semana')
  async obtenerPrediccionVentas(@Req() req: any) {
    const sucursalId = req.user.sucursalId;
    console.log(`🤖 Generando predicción para sucursal ${sucursalId}`);
    return this.prediccionesService.generarPrediccionVentas(sucursalId);
  }
}
