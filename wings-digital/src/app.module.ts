import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { MesasModule } from './mesas/mesas.module';
import { ProductosModule } from './productos/productos.module';
import { PedidosModule } from './pedidos/pedidos.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    MesasModule,
    ProductosModule,
    PedidosModule,
  ],
})
export class AppModule {}