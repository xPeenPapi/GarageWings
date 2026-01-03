import { Routes } from '@angular/router';
import { AggpedidoComponent } from './components/aggpedido/aggpedido.component';
import { MesasComponent } from './components/mesas/mesas.component';
import { LoginComponent } from './components/login/login.component';
import { PantallaCocinaComponent } from './cocina/pantalla-cocina/pantalla-cocina.component';
import { PantallaBarraComponent } from './services/barra/pantalla-barra/pantalla-barra.component'; // Verifica esta ruta
import { PagarComponent } from './caja/pagar/pagar.component';
import { authGuard } from './auth.guard';
import { Role } from './services/auth.service';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    
    // Mesero
    { 
      path: 'mesas', 
      component: MesasComponent,
      canActivate: [authGuard],
      data: { roles: [Role.Mesero, Role.Gerente, Role.AdminEmpresa] } 
    },
    
    // ✅ RUTA 1: Para Llevar (Orden Directa) - IMPORTANTE: Antes de :id (mesa)
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
    
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }
];