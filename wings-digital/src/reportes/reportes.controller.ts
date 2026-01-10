import { Controller, Get, Request } from '@nestjs/common';
import { ReportesService } from './reportes.service';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('gerente')
  async getDashboard(@Request() req) {
    // Aquí deberías obtener el ID de la empresa del usuario autenticado.
    // Por ahora, usamos 1 fijo para que funcione.
    const empresaId = 1; 
    return this.reportesService.obtenerDashboardGerente(empresaId);
  }
}