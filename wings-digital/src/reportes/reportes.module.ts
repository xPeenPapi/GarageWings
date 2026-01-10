import { Module } from '@nestjs/common';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { PrismaModule } from '../prisma/prisma.module'; // Importante para usar la BD

@Module({
  imports: [PrismaModule], 
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}