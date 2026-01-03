import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

// ✅ CORRECCIÓN: Tipos flexibles para mesa y mesero
export interface ComandaCompleta {
  id: number;        
  mesaId: number;
  // Puede ser string (nombre) u objeto { nombre: string, ... }
  mesero: any;    
  // Puede ser número (ID) u objeto { numero: string, ... }
  mesa?: any;
  
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
  private url = 'http://localhost:3000/pedidos'; 

  constructor() {
    this.socket = io(this.url, {
      transports: ['websocket'],
      autoConnect: true
    });
  }

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

  escucharNuevosPedidos(): Observable<ComandaCompleta> {
    return new Observable(observer => {
      this.socket.on('nuevoPedido', (data) => observer.next(data));
    });
  }

  escucharPedidosParaCobrar(): Observable<ComandaCompleta> {
    return new Observable(observer => {
      this.socket.on('listoParaCobrar', (data) => observer.next(data));
    });
  }

  marcarPedidoComoListo(data: { ordenId: number }) {
    this.socket.emit('pedidoListo', data);
  }
}