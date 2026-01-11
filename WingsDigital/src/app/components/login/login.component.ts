import { Component } from '@angular/core';
import { Router } from '@angular/router';
// 👇 1. Importamos 'Role' aquí también
import { AuthService, Role } from '../../services/auth.service';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  
  loginData = {
    usuario: '',    
    contrasena: ''
  };

  loading: boolean = false;

  // Variables para el modal
  mostrarAlertaModal: boolean = false;
  textoAlerta: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  iniciarSesion() {
    if (!this.loginData.usuario || !this.loginData.contrasena) {
        this.mostrarAlerta('Por favor ingresa tu correo y contraseña.');
        return;
    }

    this.loading = true;

    const credentials = {
      email: this.loginData.usuario,
      password: this.loginData.contrasena
    };

    this.authService.login(credentials).subscribe({
      next: (resp) => {
        this.loading = false;
        console.log('Login exitoso, Rol:', resp.user.rol);
        
        const rol = resp.user.rol;

        // 👇 2. USAMOS EL ENUM 'Role' PARA COMPARAR (ASÍ SE ELIMINA EL ERROR)
        switch(rol) {
          
          case Role.Gerente: // Antes: case 'GERENTE'
            this.router.navigate(['/gerente']);
            break;
            
          case Role.AdminEmpresa: // Antes: case 'ADMIN' (Esto causaba error porque en BD es ADMIN_EMPRESA)
          case Role.SuperAdmin:
            this.router.navigate(['/admin']);
            break;

          case Role.Cocinero: // Antes: case 'COCINA'
            this.router.navigate(['/pantalla-cocina']);
            break;

          case Role.Barra: 
            this.router.navigate(['/pantalla-barra']);
            break;

          case Role.Mesero:
            this.router.navigate(['/mesas']);
            break;

          case Role.Cajero: // Antes: case 'CAJA' o 'CAJERO'
            this.router.navigate(['/caja']);
            break;

          default:
            // Si el rol llega pero no coincide con los casos anteriores
            console.warn('Rol no manejado en switch:', rol);
            this.router.navigate(['/mesas']); 
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        
        if (err.status === 401) {
            this.mostrarAlerta('Usuario o contraseña incorrectos. Inténtalo de nuevo.');
        } else if (err.status === 0) {
            this.mostrarAlerta('No hay conexión con el servidor.');
        } else {
            this.mostrarAlerta('Ocurrió un error inesperado. Intenta más tarde.');
        }
      }
    });
  }

  // Métodos del Modal
  mostrarAlerta(mensaje: string) {
    this.textoAlerta = mensaje;
    this.mostrarAlertaModal = true;
  }

  cerrarAlerta() {
    this.mostrarAlertaModal = false;
  }
}