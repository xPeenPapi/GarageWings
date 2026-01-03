import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    
    // 1. Mantén esto para que al menos cargue los datos del usuario
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // ============================================================
    // 🚧 MODO DESARROLLADOR ACTIVADO 🚧
    // ============================================================
    // Retornamos TRUE inmediatamente para permitir acceso a TODO.
    // Esto te permite entrar a /caja aunque seas Mesero.
    // CUANDO TERMINES DE PROGRAMAR, BORRA O COMENTA ESTA LÍNEA:
    
    return true; 

    // ============================================================
    // 👇👇 LA LÓGICA DE SEGURIDAD REAL QUEDA ABAJO (IGNORADA) 👇👇
    // ============================================================

    /* const userRole = this.authService.getRole();
    const expectedRoles = route.data['roles'] as Array<string>;

    // Modo Dios
    if (userRole === Role.SuperAdmin || userRole === Role.AdminEmpresa || userRole === Role.Gerente) {
      return true;
    }

    if (expectedRoles && expectedRoles.length > 0) {
      const tienePermiso = expectedRoles.includes(userRole as string);

      if (!tienePermiso) {
        console.warn(`Redireccionando: Rol ${userRole} no puede entrar a ${state.url}`);
        
        // Redirección inteligente
        if (userRole === Role.Mesero) {
            this.router.navigate(['/mesas']);
        } else if (userRole === Role.Cajero) {
            this.router.navigate(['/caja']);
        } else if (userRole === Role.Cocinero) {
            this.router.navigate(['/cocina']);
        } else {
            this.router.navigate(['/home']); 
        }
        return false;
      }
    }

    return true;
    */
  }
}