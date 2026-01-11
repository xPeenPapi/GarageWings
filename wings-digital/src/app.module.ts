import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { MesasModule } from './mesas/mesas.module';
import { ProductosModule } from './productos/productos.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { ReportesModule } from './reportes/reportes.module';
import { PersonalModule } from './personal/personal.module';
// 👇 1. IMPORTAR LOS MÓDULOS NUEVOS
import { TurnosModule } from './turnos/turnos.module';
import { SucursalesModule } from './sucursales/sucursales.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    MesasModule,
    ProductosModule,
    PedidosModule,
    ReportesModule,
    PersonalModule,
    // 👇 2. AGREGARLOS A LA LISTA DE IMPORTS
    TurnosModule,     // Para gestionar horarios
    SucursalesModule, // Para abrir nuevas ubicaciones
  ],
})
export class AppModule {}