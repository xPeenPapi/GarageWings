import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


// ✅ MANTENEMOS TU INTERFAZ FLEXIBLE (Para que no falle el HTML)
export interface ComandaCompleta {
  id: number;
  mesaId: number;
  mesero: any; // Flexible: string u objeto
  mesa?: any;  // Flexible: número u objeto
  total: number;
  fecha: string | Date;
  items: any[];
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  // Ajusta puerto si es necesario
  private url = `${environment.apiUrl}/pedidos`; // ✅ ACTUALIZADO

  constructor() {
    this.socket = io(this.url, {
      transports: ['websocket'],
      autoConnect: true // Se conecta al instanciarse
    });
  }

  // ==========================================
  // 1. MÉTODOS BÁSICOS DE CONEXIÓN
  // ==========================================

  isConnected(): boolean {
    return this.socket.connected;
  }

  reconnect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // ==========================================
  // 2. ⚠️ LA SOLUCIÓN AL ERROR DE APP.COMPONENT
  // ==========================================

  // Agregamos este método para que app.component.ts pueda decir:
  // this.socketService.emit('registrar-usuario', id)
  emit(eventName: string, data?: any) {
    this.socket.emit(eventName, data);
  }

  // Agregamos este método para escuchar cualquier evento genérico
  // (necesario para escuchar 'force-logout' en app.component)
  fromEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>(observer => {
      this.socket.on(eventName, (data: T) => {
        observer.next(data);
      });
      
      // Limpieza al desuscribirse
      return () => {
        this.socket.off(eventName);
      };
    });
  }

  // ==========================================
  // 3. TUS MÉTODOS DE NEGOCIO (ORIGINALES)
  // ==========================================

  escucharNuevosPedidos(): Observable<ComandaCompleta> {
    return this.fromEvent<ComandaCompleta>('nuevoPedido');
  }

  escucharPedidosParaCobrar(): Observable<ComandaCompleta> {
    return this.fromEvent<ComandaCompleta>('listoParaCobrar');
  }

  marcarPedidoComoListo(data: { ordenId: number }) {
    this.emit('pedidoListo', data);
  }
}