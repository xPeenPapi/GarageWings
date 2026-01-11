import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SocketService } from './services/socket.service';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  
  title = 'WingsDigital';
  
  // Guardamos las suscripciones para limpiar memoria al salir
  private logoutSub: Subscription | null = null;
  private connectSub: Subscription | null = null;

  constructor(
    private socketService: SocketService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // 1. Si al cargar la página ya hay usuario, activamos el radar
    if (this.authService.isAuthenticated()) {
      this.iniciarSeguridad();
    }

    // 2. Si el usuario hace Login o Logout, encendemos/apagamos el radar
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.iniciarSeguridad();
      } else {
        this.detenerSeguridad();
      }
    });
  }

  iniciarSeguridad() {
    // A) Conectar el socket si no lo está
    if (!this.socketService.isConnected()) {
        this.socketService.reconnect(); 
    }

    // B) REGISTRARME: "Hola servidor, soy el Usuario X"
    const userId = this.authService.getUserId();
    
    // Intento 1: Enviar ya mismo
    if (userId) {
        this.socketService.emit('registrar-usuario', userId);
    }

    // Intento 2 (Blindaje): Si el internet parpadea y se reconecta, enviarlo de nuevo
    if (!this.connectSub) {
        this.connectSub = this.socketService.fromEvent('connect').subscribe(() => {
            const currentId = this.authService.getUserId();
            if (currentId) {
                console.log('🔄 Reconexión detectada. Re-validando sesión...');
                this.socketService.emit('registrar-usuario', currentId);
            }
        });
    }

    // C) ESCUCHAR LA ORDEN DE EXPULSIÓN ('force-logout')
    if (this.logoutSub) return; // Evitamos duplicar la escucha

    this.logoutSub = this.socketService.fromEvent('force-logout').subscribe(() => {
        console.warn('⚠️ El servidor ha ordenado cerrar esta sesión.');
        
        // 👇 AQUÍ ESTÁ EL MENSAJE QUE PIDES
        // El 'alert' congela la pantalla. El usuario TIENE que leerlo y dar Aceptar.
        // La redirección NO ocurrirá hasta que el usuario acepte el mensaje.
        alert(
            '⚠️ CIERRE DE SESIÓN POR SEGURIDAD\n\n' +
            'Se ha detectado que tu cuenta ingresó en otro dispositivo o pestaña.\n\n' +
            'Para evitar conflictos en las comandas, esta ventana se cerrará.'
        );
        
        // Solo cuando el usuario da "Aceptar" en la alerta, se ejecuta esto:
        this.authService.logout();
    });
  }

  detenerSeguridad() {
    if (this.logoutSub) {
      this.logoutSub.unsubscribe();
      this.logoutSub = null;
    }
    if (this.connectSub) {
      this.connectSub.unsubscribe();
      this.connectSub = null;
    }
  }

  ngOnDestroy() {
    this.detenerSeguridad();
  }
}