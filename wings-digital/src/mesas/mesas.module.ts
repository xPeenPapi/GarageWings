import { Module } from '@nestjs/common';
import { MesasController } from './mesas.controller';
import { MesaService } from './mesa.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MesasController],
  providers: [MesaService],
  exports: [MesaService],
})
export class MesasModule {}