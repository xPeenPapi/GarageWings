import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SocketService, ComandaCompleta } from '../../socket.service'; // Asegúrate que la ruta sea correcta
import { AuthService } from '../../auth.service'; // Asegúrate que la ruta sea correcta
import { PedidosService } from '../../pedidos.service'; // Asegúrate que la ruta sea correcta
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pantalla-barra',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pantalla-barra.component.html',
  styleUrls: ['./pantalla-barra.component.css']
})
export class PantallaBarraComponent implements OnInit, OnDestroy {
  
  // ✅ OPTIMIZACIÓN: Solo 2 estados para Barra (Por hacer y Hecho)
  nuevosPedidos: ComandaCompleta[] = [];
  listosPedidos: ComandaCompleta[] = [];
  
  private socketSub: Subscription | undefined;

  // Iconos temáticos de BARRA 🍸
  iconos = {
    nuevos: 'fas fa-wine-bottle', // Icono de botella/bebida
    servir: 'fas fa-hand-holding-water', // Icono de servir
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

    this.socketSub = this.socketService.escucharPedidosParaCobrar().subscribe((pedido) => {
        // Nota: Reutilizamos el socket de pedidos generales para detectar cambios
        // Idealmente deberías tener un 'escucharNuevosPedidos' específico si tu backend lo soporta
        // Si no, recargamos la lista o procesamos si viene el objeto completo
        this.zone.run(() => {
             // Si llega un pedido nuevo, lo procesamos
             // Aquí asumimos que el socket devuelve la orden completa
             this.procesarPedidoEntrante(pedido as any);
        });
    });
  }

  distribuirPedidos(pedidos: any[]) {
    // Limpiamos listas para evitar duplicados al recargar
    this.nuevosPedidos = [];
    this.listosPedidos = [];
    pedidos.forEach(p => this.procesarPedidoEntrante(p));
  }

  procesarPedidoEntrante(pedido: any) {
    // ⚠️ FILTRO MÁGICO: Solo aceptamos la orden si tiene algo para la BARRA
    const tieneBebida = pedido.items.some((item: any) => item.producto?.destino === 'BARRA');
    
    if (!tieneBebida) return;

    // Evitar duplicados visuales si ya existe
    if (this.existePedido(pedido.id)) return;

    // ✅ LÓGICA SIMPLIFICADA: 
    // Si está Pendiente o En Preparación -> Va a "Nuevos" (Por servir)
    // Si está Lista -> Va a "Listos"
    if (pedido.estado === 'PENDIENTE' || pedido.estado === 'EN_PREPARACION') {
        this.nuevosPedidos.push(pedido);
    } else if (pedido.estado === 'LISTA') {
        this.listosPedidos.push(pedido);
    }
  }

  existePedido(id: number): boolean {
    return [...this.nuevosPedidos, ...this.listosPedidos].some(p => p.id === id);
  }

  // ✅ ACCIÓN RÁPIDA: De Pendiente a LISTO directamente
  marcarComoServido(pedido: ComandaCompleta) {
      // 1. Llamada a la API (Backend) -> Directo a LISTA
      this.pedidosService.actualizarEstado(pedido.id, 'LISTA').subscribe({
        next: (ordenActualizada) => {
          console.log('✅ Bebida servida (Estado: LISTA)');
          
          // 2. Mover visualmente
          const index = this.nuevosPedidos.findIndex(p => p.id === pedido.id);
          if (index !== -1) {
            this.nuevosPedidos.splice(index, 1);
            // Actualizamos el estado localmente para reflejar el cambio
            const pedidoActualizado = { ...pedido, estado: 'LISTA' };
            this.listosPedidos.push(pedidoActualizado);
          }
        },
        error: (err) => alert('Error al actualizar estado: ' + err.message)
      });
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