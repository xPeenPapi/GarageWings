import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SocketService, ComandaCompleta } from '../../socket.service';
import { AuthService } from '../../auth.service';
import { PedidosService } from '../../pedidos.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pantalla-barra',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pantalla-barra.component.html',
  styleUrls: ['./pantalla-barra.component.css']
})
export class PantallaBarraComponent implements OnInit, OnDestroy {
  
  nuevosPedidos: ComandaCompleta[] = [];
  preparandoPedidos: ComandaCompleta[] = [];
  listosPedidos: ComandaCompleta[] = [];
  
  private socketSub: Subscription | undefined;

  // Iconos temáticos de BARRA 🍸
  iconos = {
    nuevos: 'fas fa-bell',
    preparando: 'fas fa-cocktail', // Icono de cóctel
    listos: 'fas fa-check-circle',
    marcarListo: 'fas fa-check'
  };

  constructor(
    private socketService: SocketService,
    private pedidosService: PedidosService,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    // 1. Cargar historial de BD
    this.pedidosService.obtenerPendientes().subscribe({
      next: (pedidos) => {
        console.log('📥 Barra: Historial recuperado', pedidos);
        this.distribuirPedidos(pedidos);
      },
      error: (err) => console.error(err)
    });

    // 2. Conectar Socket
    if (!this.socketService.isConnected()) this.socketService.reconnect();

    this.socketSub = this.socketService.escucharNuevosPedidos().subscribe((pedido) => {
      this.zone.run(() => {
        console.log('🔔 Barra: Nuevo pedido entrante', pedido);
        this.procesarPedidoEntrante(pedido);
      });
    });
  }

  distribuirPedidos(pedidos: any[]) {
    pedidos.forEach(p => this.procesarPedidoEntrante(p));
  }

  procesarPedidoEntrante(pedido: any) {
    // Evitar duplicados
    if (this.existePedido(pedido.id)) return;

    // ⚠️ FILTRO MÁGICO: Solo aceptamos la orden si tiene algo para la BARRA
    const tieneBebida = pedido.items.some((item: any) => item.producto?.destino === 'BARRA');
    
    if (tieneBebida) {
      if (pedido.estado === 'PENDIENTE') {
        this.nuevosPedidos.push(pedido);
      } else if (pedido.estado === 'EN_PREPARACION') {
        this.preparandoPedidos.push(pedido);
      } else if (pedido.estado === 'LISTA') {
        this.listosPedidos.push(pedido);
      }
    }
  }

  existePedido(id: number): boolean {
    return [...this.nuevosPedidos, ...this.preparandoPedidos, ...this.listosPedidos].some(p => p.id === id);
  }

  marcarComoPreparando(pedido: ComandaCompleta) {
      // 1. Llamada a la API (Backend)
      this.pedidosService.actualizarEstado(pedido.id, 'EN_PREPARACION').subscribe({
        next: (ordenActualizada) => {
          console.log('✅ Estado actualizado en BD: EN_PREPARACION');
          
          // 2. Mover visualmente (Solo si la BD respondió ok)
          const index = this.nuevosPedidos.findIndex(p => p.id === pedido.id);
          if (index !== -1) {
            this.nuevosPedidos.splice(index, 1);
            this.preparandoPedidos.push(pedido);
          }
        },
        error: (err) => alert('Error al guardar estado: ' + err.message)
      });
    }
    marcarComoListo(pedido: ComandaCompleta) {
    // 1. Llamada a la API (Backend)
    this.pedidosService.actualizarEstado(pedido.id, 'LISTA').subscribe({
      next: (ordenActualizada) => {
        console.log('✅ Estado actualizado en BD: LISTA');

        // 2. Mover visualmente
        const index = this.preparandoPedidos.findIndex(p => p.id === pedido.id);
        if (index !== -1) {
          this.preparandoPedidos.splice(index, 1);
          this.listosPedidos.push(pedido);
        }
        
        // NOTA: Ya no necesitamos llamar a socketService.marcarPedidoComoListo() aquí manual,
        // porque ahora el Controlador del Backend lo hace automático al recibir el PATCH.
      },
      error: (err) => alert('Error al finalizar pedido: ' + err.message)
    });
  }
  moverPedido(pedido: any, origen: any[], destino: any[]) {
    const idx = origen.findIndex(p => p.id === pedido.id);
    if (idx !== -1) {
      origen.splice(idx, 1);
      destino.push(pedido);
    }
  }

  formatearOpcion(valor: any): string {
    if (Array.isArray(valor)) return valor.join(', ');
    return String(valor);
  }

  salir() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (this.socketSub) this.socketSub.unsubscribe();
  }
}