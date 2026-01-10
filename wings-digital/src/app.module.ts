import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { MesasModule } from './mesas/mesas.module';
import { ProductosModule } from './productos/productos.module';
import { PedidosModule } from './pedidos/pedidos.module';
// 👇 1. IMPORTAR EL MÓDULO DE REPORTES
import { ReportesModule } from './reportes/reportes.module';
import { PersonalModule } from './personal/personal.module'; // 👈 Importar

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    MesasModule,
    ProductosModule,
    PedidosModule,
    // 👇 2. AGREGARLO A LOS IMPORTS
    ReportesModule,
    PersonalModule
  ],
})
export class AppModule {}