import { Module } from '@nestjs/common';
import { SucursalesController } from './sucursales.controller';
import { SucursalesService } from './sucursales.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SucursalesController],
  providers: [SucursalesService],
})
export class SucursalesModule {}