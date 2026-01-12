import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';

// Asegúrate de que las rutas a tus servicios sean correctas
import { SocketService, ComandaCompleta } from '../../socket.service';
import { AuthService } from '../../auth.service';
import { PedidosService } from '../../pedidos.service';

@Component({
  selector: 'app-pantalla-barra',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pantalla-barra.component.html',
  styleUrls: ['./pantalla-barra.component.css']
})
export class PantallaBarraComponent implements OnInit, OnDestroy {
  
  // ✅ Solo 2 listas: Por Servir (Pendientes) y Para Entregar (Listos)
  nuevosPedidos: ComandaCompleta[] = [];
  listosPedidos: ComandaCompleta[] = [];
  
  private subscriptions = new Subscription();

  // Iconos temáticos de BARRA 🍸
  iconos = {
    nuevos: 'fas fa-wine-bottle', 
    servir: 'fas fa-hand-holding-water',
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
    // 1. Carga inicial de datos
    this.cargarPedidos();

    // 2. Intervalo de seguridad (polling) cada 15 segundos
    // Esto asegura que si el socket falla, las bebidas lleguen igual.
    this.subscriptions.add(
      interval(15000).subscribe(() => this.cargarPedidos())
    );

    // 3. Conexión por WebSockets (Tiempo real)
    this.conectarSocket();
  }

  cargarPedidos() {
    this.pedidosService.obtenerPendientes().subscribe({
      next: (pedidos) => {
        // console.log('📥 Barra: Sincronizando pedidos...', pedidos.length);
        this.distribuirPedidos(pedidos);
      },
      error: (err) => console.error('Error cargando pedidos:', err)
    });
  }

  conectarSocket() {
    if (!this.socketService.isConnected()) this.socketService.reconnect();

    // ✅ CORRECCIÓN IMPORTANTE: Escuchamos 'escucharNuevosPedidos', no 'PedidosParaCobrar'
    // La barra necesita ver el pedido en cuanto el mesero lo envía.
    this.subscriptions.add(
      this.socketService.escucharNuevosPedidos().subscribe((pedido) => {
        this.zone.run(() => {
             console.log('🔔 Barra: Nuevo pedido detectado por socket');
             // Si el socket devuelve solo el ID o un objeto parcial, recargamos todo para evitar errores
             // Si devuelve el objeto completo, lo procesamos directo.
             // Por seguridad, aquí llamamos a procesar si es completo, o recargamos.
             if (pedido && pedido.items) {
                this.procesarPedidoEntrante(pedido as any);
             } else {
                this.cargarPedidos();
             }
        });
      })
    );
  }

  distribuirPedidos(pedidos: any[]) {
    // Reiniciamos las listas para evitar duplicados al refrescar
    const nuevosTemp: ComandaCompleta[] = [];
    const listosTemp: ComandaCompleta[] = [];

    pedidos.forEach(p => {
        // Filtro: Solo nos importan los pedidos que tengan bebidas (BARRA)
        const tieneBebida = p.items.some((item: any) => item.producto?.destino === 'BARRA');
        
        if (tieneBebida) {
            // Lógica Fast Track: Pendiente o Preparando -> A la lista de "Por Servir"
            if (p.estado === 'PENDIENTE' || p.estado === 'EN_PREPARACION') {
                nuevosTemp.push(p);
            } 
            // Si ya está lista -> A la lista de "Entregar"
            else if (p.estado === 'LISTA') {
                listosTemp.push(p);
            }
        }
    });

    this.nuevosPedidos = nuevosTemp;
    this.listosPedidos = listosTemp;
  }

  procesarPedidoEntrante(pedido: any) {
    // ⚠️ FILTRO: Verificamos si este pedido nuevo trae cosas de BARRA
    const tieneBebida = pedido.items.some((item: any) => item.producto?.destino === 'BARRA');
    
    if (!tieneBebida) return; // Si es pura comida, lo ignoramos en esta pantalla

    // Evitar duplicados si ya lo tenemos en pantalla
    if (this.existePedido(pedido.id)) return;

    // Agregar a la lista correspondiente
    if (pedido.estado === 'PENDIENTE' || pedido.estado === 'EN_PREPARACION') {
        this.nuevosPedidos.push(pedido);
    } else if (pedido.estado === 'LISTA') {
        this.listosPedidos.push(pedido);
    }
  }

  existePedido(id: number): boolean {
    return [...this.nuevosPedidos, ...this.listosPedidos].some(p => p.id === id);
  }

  // ✅ ACCIÓN RÁPIDA: Marca como LISTA directamente (Salta "Preparando")
  marcarComoServido(pedido: ComandaCompleta) {
      // 1. Quitamos visualmente de inmediato para sensación de rapidez
      const index = this.nuevosPedidos.findIndex(p => p.id === pedido.id);
      if (index !== -1) {
        this.nuevosPedidos.splice(index, 1);
        const pedidoListo = { ...pedido, estado: 'LISTA' };
        this.listosPedidos.push(pedidoListo);
      }

      // 2. Enviamos la actualización al backend
      this.pedidosService.actualizarEstado(pedido.id, 'LISTA').subscribe({
        next: (ordenActualizada) => {
          console.log('✅ Bebida servida confirmada en BD');
        },
        error: (err) => {
          console.error('❌ Error al actualizar estado:', err);
          // Si falla, recargamos para corregir la vista
          this.cargarPedidos();
        }
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
    this.subscriptions.unsubscribe();
  }
}