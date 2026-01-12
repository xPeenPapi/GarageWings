import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { SocketService, ComandaCompleta } from '../../socket.service';
import { AuthService } from '../../auth.service';
import { PedidosService } from '../../pedidos.service';

// Interfaz local para la tarjeta visual (UI)
interface ItemVisual {
  pedidoId: number;
  itemId: number;
  productoNombre: string;
  cantidad: number;
  mesaNumero: string;
  tiempo: number;
  notas?: string;
  opciones?: any;
  esElaborada: boolean;
  horaInicio: Date;
}

@Component({
  selector: 'app-pantalla-barra',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pantalla-barra.component.html',
  styleUrls: ['./pantalla-barra.component.css']
})
export class PantallaBarraComponent implements OnInit, OnDestroy {
  
  // Datos del backend
  nuevosPedidos: ComandaCompleta[] = [];
  listosPedidos: ComandaCompleta[] = [];
  
  // Datos transformados para la UI
  itemsPendientes: ItemVisual[] = [];
  
  // Variables UI
  nombreBarista: string = '';
  horaActual: string = '';
  conteoPendientes: number = 0;
  conteoPreparando: number = 0;
  conteoListas: number = 0;

  private subscriptions = new Subscription();

  constructor(
    private socketService: SocketService,
    private pedidosService: PedidosService,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone
  ) {
    this.nombreBarista = this.authService.getNombreUsuario() || 'Barista';
    this.actualizarReloj();
    setInterval(() => this.actualizarReloj(), 1000);
    // Recalcular el tiempo "hace X min" cada minuto
    setInterval(() => this.recalcularTiempos(), 60000); 
  }

  ngOnInit(): void {
    this.cargarPedidos();
    // Intervalo de seguridad para refrescar datos cada 15s
    this.subscriptions.add(interval(15000).subscribe(() => this.cargarPedidos()));
    this.conectarSocket();
  }

  actualizarReloj() {
    const now = new Date();
    this.horaActual = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  cargarPedidos() {
    this.pedidosService.obtenerPendientes().subscribe({
      next: (pedidos) => this.distribuirPedidos(pedidos),
      error: (err) => console.error(err)
    });
  }

  conectarSocket() {
    if (!this.socketService.isConnected()) this.socketService.reconnect();
    this.subscriptions.add(
      this.socketService.escucharNuevosPedidos().subscribe((pedido) => {
        this.zone.run(() => {
             // Si llega el pedido completo lo procesamos, sino recargamos todo
             if (pedido && pedido.items) this.procesarPedidoEntrante(pedido as any);
             else this.cargarPedidos();
        });
      })
    );
  }

  distribuirPedidos(pedidos: any[]) {
    const nuevos: ComandaCompleta[] = [];
    const listos: ComandaCompleta[] = [];

    pedidos.forEach(p => {
        const tieneBebida = p.items.some((item: any) => item.producto?.destino === 'BARRA');
        if (tieneBebida) {
            if (p.estado === 'PENDIENTE' || p.estado === 'EN_PREPARACION') nuevos.push(p);
            else if (p.estado === 'LISTA') listos.push(p);
        }
    });

    this.nuevosPedidos = nuevos;
    this.listosPedidos = listos;
    this.actualizarListasVisuales(); 
  }

  procesarPedidoEntrante(pedido: any) {
    const tieneBebida = pedido.items.some((item: any) => item.producto?.destino === 'BARRA');
    if (!tieneBebida) return;
    
    // Evitar duplicados y agregar
    if (!this.nuevosPedidos.find(p => p.id === pedido.id) && !this.listosPedidos.find(p => p.id === pedido.id)) {
        if (pedido.estado === 'PENDIENTE' || pedido.estado === 'EN_PREPARACION') this.nuevosPedidos.push(pedido);
        else if (pedido.estado === 'LISTA') this.listosPedidos.push(pedido);
        this.actualizarListasVisuales();
    }
  }

  // 🔥 Convierte pedidos agrupados en tarjetas individuales
  actualizarListasVisuales() {
      this.itemsPendientes = [];
      
      this.nuevosPedidos.forEach(pedido => {
          // ✅ CORRECCIÓN AQUÍ: Usamos (pedido as any) para leer 'creadaEn' o 'createdAt' sin errores
          const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || (pedido as any).fecha || new Date();
          const horaInicio = new Date(fechaOrigen);
          
          pedido.items.forEach((item: any, index) => {
              if (item.producto?.destino === 'BARRA') {
                  // Lógica para determinar si es "Elaborada"
                  const esElaborada = item.producto?.categoria?.nombre === 'Cocteleria' || (item.notas && item.notas.length > 0);

                  this.itemsPendientes.push({
                      pedidoId: pedido.id,
                      itemId: index,
                      productoNombre: item.producto.nombre,
                      cantidad: item.cantidad,
                      mesaNumero: pedido.mesa?.numero || 'S/N',
                      tiempo: this.getMinutosTranscurridos(horaInicio),
                      notas: item.notas,
                      opciones: item.opcionesElegidas,
                      esElaborada: !!esElaborada,
                      horaInicio: horaInicio
                  });
              }
          });
      });

      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoListas = this.listosPedidos.length;
  }

  marcarItemComoListo(itemVisual: ItemVisual) {
      // 1. Quitar visualmente de inmediato (UI Optimista)
      this.itemsPendientes = this.itemsPendientes.filter(i => 
          !(i.pedidoId === itemVisual.pedidoId && i.itemId === itemVisual.itemId)
      );
      this.conteoPendientes = this.itemsPendientes.length;

      // 2. Verificar si quedan items de ese mismo pedido
      const quedanItemsDelPedido = this.itemsPendientes.some(i => i.pedidoId === itemVisual.pedidoId);
      
      if (!quedanItemsDelPedido) {
          // Si ya no quedan bebidas pendientes de esa orden, la cerramos en Backend
          this.pedidosService.actualizarEstado(itemVisual.pedidoId, 'LISTA').subscribe({
            next: () => console.log(`✅ Pedido ${itemVisual.pedidoId} completado`),
            error: () => this.cargarPedidos() // Revertir si falla
          });
          
          // Mover pedido a listos localmente
          const pedidoIndex = this.nuevosPedidos.findIndex(p => p.id === itemVisual.pedidoId);
          if(pedidoIndex !== -1) {
              const pedido = this.nuevosPedidos[pedidoIndex];
              this.nuevosPedidos.splice(pedidoIndex, 1);
              this.listosPedidos.push(pedido);
              this.conteoListas++;
          }
      }
  }

  // Auxiliares de tiempo
  getMinutosTranscurridos(fecha: Date): number {
      const diff = new Date().getTime() - new Date(fecha).getTime();
      return Math.floor(diff / 60000); // Diferencia en minutos
  }

  recalcularTiempos() {
      this.itemsPendientes.forEach(item => {
          item.tiempo = this.getMinutosTranscurridos(item.horaInicio);
      });
  }

  salir() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}