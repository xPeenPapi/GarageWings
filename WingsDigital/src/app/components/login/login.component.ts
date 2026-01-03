import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule], // Importante importar FormsModule
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  
  // ✅ Objeto enlazado al formulario HTML con ngModel
  loginData = {
    usuario: '',     // Corresponde al email
    contrasena: ''
  };

  errorMsg: string = '';
  loading: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  iniciarSesion() {
    this.loading = true;
    this.errorMsg = '';

    const credentials = {
      email: this.loginData.usuario,
      password: this.loginData.contrasena
    };

    this.authService.login(credentials).subscribe({
      next: (resp) => {
        this.loading = false;
        console.log('Login exitoso, Rol:', resp.user.rol);
        
        // Redirección basada en Rol
        switch(resp.user.rol) {
          case 'COCINA':
            this.router.navigate(['/pantalla-cocina']);
            break;
          case 'BARRA': // ⬅️ AGREGADO
            this.router.navigate(['/pantalla-barra']);
            break;
          case 'MESERO':
            this.router.navigate(['/mesas']);
            break;
          case 'CAJA':
            this.router.navigate(['/caja']);
            break;
          default:
            this.router.navigate(['/mesas']); // Gerente o Admin
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.errorMsg = 'Usuario o contraseña incorrectos';
      }
    });
  }
}