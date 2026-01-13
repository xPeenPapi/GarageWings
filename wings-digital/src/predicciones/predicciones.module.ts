import { Module } from '@nestjs/common';
import { PrediccionesController } from './predicciones.controller';
import { PrediccionesService } from './predicciones.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrediccionesController],
  providers: [PrediccionesService],
  exports: [PrediccionesService]
})
export class PrediccionesModule {}
