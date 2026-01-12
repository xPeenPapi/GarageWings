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
  
  // ✅ Listas de pedidos
  nuevosPedidos: ComandaCompleta[] = [];
  listosPedidos: ComandaCompleta[] = [];
  
  // ✅ Variables para la UI (Nuevo Diseño)
  nombreBarista: string = '';
  horaActual: string = '';
  conteoPendientes: number = 0;
  conteoListas: number = 0;
  // Agregamos este aunque no lo usemos visualmente para evitar errores en HTML si lo requiere
  conteoPreparando: number = 0; 

  private subscriptions = new Subscription();

  // Iconos temáticos
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
  ) {
    // Inicializar datos del usuario
    this.nombreBarista = this.authService.getNombreUsuario() || 'Barista';

    // Iniciar Reloj
    this.actualizarReloj();
    setInterval(() => this.actualizarReloj(), 1000);
  }

  ngOnInit(): void {
    // 1. Carga inicial
    this.cargarPedidos();

    // 2. Intervalo de seguridad (15s)
    this.subscriptions.add(
      interval(15000).subscribe(() => this.cargarPedidos())
    );

    // 3. Conexión Socket
    this.conectarSocket();
  }

  actualizarReloj() {
    const now = new Date();
    this.horaActual = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  cargarPedidos() {
    this.pedidosService.obtenerPendientes().subscribe({
      next: (pedidos) => {
        this.distribuirPedidos(pedidos);
      },
      error: (err) => console.error('Error cargando pedidos:', err)
    });
  }

  conectarSocket() {
    if (!this.socketService.isConnected()) this.socketService.reconnect();

    this.subscriptions.add(
      this.socketService.escucharNuevosPedidos().subscribe((pedido) => {
        this.zone.run(() => {
             console.log('🔔 Barra: Nuevo pedido detectado');
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
    const nuevosTemp: ComandaCompleta[] = [];
    const listosTemp: ComandaCompleta[] = [];

    pedidos.forEach(p => {
        const tieneBebida = p.items.some((item: any) => item.producto?.destino === 'BARRA');
        
        if (tieneBebida) {
            if (p.estado === 'PENDIENTE' || p.estado === 'EN_PREPARACION') {
                nuevosTemp.push(p);
            } else if (p.estado === 'LISTA') {
                listosTemp.push(p);
            }
        }
    });

    this.nuevosPedidos = nuevosTemp;
    this.listosPedidos = listosTemp;
    this.actualizarContadores();
  }

  procesarPedidoEntrante(pedido: any) {
    const tieneBebida = pedido.items.some((item: any) => item.producto?.destino === 'BARRA');
    if (!tieneBebida) return;

    if (this.existePedido(pedido.id)) return;

    if (pedido.estado === 'PENDIENTE' || pedido.estado === 'EN_PREPARACION') {
        this.nuevosPedidos.push(pedido);
    } else if (pedido.estado === 'LISTA') {
        this.listosPedidos.push(pedido);
    }
    this.actualizarContadores();
  }

  existePedido(id: number): boolean {
    return [...this.nuevosPedidos, ...this.listosPedidos].some(p => p.id === id);
  }

  // ✅ Actualiza los números del encabezado (KPIs)
  actualizarContadores() {
    this.conteoPendientes = this.nuevosPedidos.length;
    this.conteoListas = this.listosPedidos.length;
    this.conteoPreparando = 0; // No usamos estado intermedio en este diseño
  }

  marcarComoServido(pedido: ComandaCompleta) {
      // Optimistic UI Update (Inmediato)
      const index = this.nuevosPedidos.findIndex(p => p.id === pedido.id);
      if (index !== -1) {
        this.nuevosPedidos.splice(index, 1);
        const pedidoListo = { ...pedido, estado: 'LISTA' };
        this.listosPedidos.push(pedidoListo);
        this.actualizarContadores();
      }

      // Backend Update
      this.pedidosService.actualizarEstado(pedido.id, 'LISTA').subscribe({
        next: () => console.log('✅ Bebida servida confirmada en BD'),
        error: (err) => {
          console.error('❌ Error al actualizar:', err);
          this.cargarPedidos(); // Revertir si falla
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