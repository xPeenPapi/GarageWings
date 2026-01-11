import { Controller, Get, Query, UseGuards } from '@nestjs/common'; // 👈 Importa Query
import { ReportesService } from './reportes.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('reportes')
//@UseGuards(AuthGuard('jwt')) // Descomentar si usas seguridad
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('gerente')
  // 👇 Recibimos el query param 'fecha'
  getDashboardData(@Query('fecha') fecha: string) {
    return this.reportesService.getDashboardData(fecha);
  }
}