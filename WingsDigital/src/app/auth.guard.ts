import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService, Role } from './services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Verificar si hay token y usuario cargado
  const token = authService.token;
  
  if (!token) {
    console.log('⛔ No hay token, redirigiendo al login');
    router.navigate(['/login']);
    return false;
  }

  // 2. Obtiene los roles requeridos desde el archivo de rutas
  // NOTA: Ahora casteamos a Role[] (Array de strings), no de números
  const rolesRequeridos = route.data['roles'] as Role[];
  
  // 3. Si la ruta no pide roles, deja pasar
  if (!rolesRequeridos || rolesRequeridos.length === 0) {
    return true; 
  }

  // 4. Obtiene el rol del usuario actual
  const rolUsuario = authService.getRole();

  // 5. Verificación estricta
  if (rolUsuario && rolesRequeridos.includes(rolUsuario)) {
    return true;
  }

  // 6. Acceso denegado
  console.warn(`⛔ Acceso denegado. Requerido: ${rolesRequeridos} | Tienes: ${rolUsuario}`);
  alert('No tienes permisos para acceder a esta sección');
  
  // Redirección inteligente: si ya está logueado pero no tiene permiso, mándalo a su home
  // O al login si prefieres
  router.navigate(['/login']);
  return false;
};