import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PedidosGateway } from './pedidos.gateway'; // ⬅️ Importar Gateway

@Module({
  imports: [PrismaModule],
  controllers: [PedidosController],
  providers: [
    PedidosService, 
    PedidosGateway // ⬅️ ¡VITAL! Debe estar aquí
  ],
  exports: [PedidosGateway] // Opcional, pero buena práctica
})
export class PedidosModule {}