import { Routes } from '@angular/router';
import { AggpedidoComponent } from './components/aggpedido/aggpedido.component';
import { MesasComponent } from './components/mesas/mesas.component';
import { LoginComponent } from './components/login/login.component';
import { PantallaCocinaComponent } from './cocina/pantalla-cocina/pantalla-cocina.component';
import { PantallaBarraComponent } from './services/barra/pantalla-barra/pantalla-barra.component';
import { PagarComponent } from './caja/pagar/pagar.component';
import { authGuard } from './auth.guard';
import { Role } from './services/auth.service';
import { GerenteDashboardComponent } from './components/gerente-dashboard/gerente-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    
    // Mesero
    { 
      path: 'mesas', 
      component: MesasComponent,
      canActivate: [authGuard],
      data: { roles: [Role.Mesero, Role.Gerente, Role.AdminEmpresa] } 
    },
    
    // ✅ RUTA 1: Para Llevar (Orden Directa)
    { 
      path: 'pedido/orden/:idOrden', 
      component: AggpedidoComponent,
      canActivate: [authGuard],
      data: { roles: [Role.Mesero, Role.Gerente, Role.AdminEmpresa] }
    },

    // ✅ RUTA 2: Mesa (ID Mesa)
    { 
      path: 'pedido/:id', 
      component: AggpedidoComponent,
      canActivate: [authGuard],
      data: { roles: [Role.Mesero, Role.Gerente, Role.AdminEmpresa] }
    },

    // Cocina
    { 
      path: 'pantalla-cocina', 
      component: PantallaCocinaComponent,
      canActivate: [authGuard],
      data: { roles: [Role.Cocinero, Role.Gerente, Role.AdminEmpresa] }
    },
    
    // Barra
    { 
      path: 'pantalla-barra', 
      component: PantallaBarraComponent,
      canActivate: [authGuard],
      data: { roles: [Role.Barra, Role.Gerente, Role.AdminEmpresa] }
    },

    // Caja
    { 
      path: 'caja', 
      component: PagarComponent,
      canActivate: [authGuard],
      data: { roles: [Role.Cajero, Role.Gerente, Role.AdminEmpresa] }
    },

    // ✅ GERENTE (Protegida y Simplificada)
    {
      path: 'gerente', // Antes era 'gerente/dashboard'
      component: GerenteDashboardComponent,
      canActivate: [authGuard],
      // El Admin también puede entrar por si acaso
      data: { roles: [Role.Gerente, Role.AdminEmpresa] } 
    },

    // ✅ ADMIN (Protegida y Simplificada)
    {
      path: 'admin', // Antes era 'admin/dashboard'
      component: AdminDashboardComponent,

    },
    
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }
];