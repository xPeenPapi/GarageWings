import { Module } from '@nestjs/common';
import { MesasController } from './mesas.controller';
import { MesaService } from './mesa.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MesasController],
  providers: [MesaService],
  exports: [MesaService],
})
export class MesasModule {}