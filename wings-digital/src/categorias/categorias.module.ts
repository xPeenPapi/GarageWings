import { Module } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Importa tu módulo de Prisma

@Module({
  imports: [PrismaModule],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService] // Exportamos por si otros módulos lo necesitan
})
export class CategoriasModule {}