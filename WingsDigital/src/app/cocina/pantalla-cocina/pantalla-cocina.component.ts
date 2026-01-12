import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { SocketService, ComandaCompleta } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { PedidosService } from '../../services/pedidos.service';

// ✅ Interfaz definida como ItemCocina
interface ItemCocina {
  pedidoId: number;
  itemId: number;
  productoNombre: string;
  cantidad: number;
  mesaNumero: string;
  tiempo: number;
  notas?: string;
  opciones?: any;
  horaInicio: Date;
}

@Component({
  selector: 'app-pantalla-cocina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pantalla-cocina.component.html',
  styleUrls: ['./pantalla-cocina.component.css']
})
export class PantallaCocinaComponent implements OnInit, OnDestroy {
  
  // Listas de Cocina
  nuevosPedidos: ComandaCompleta[] = [];
  preparandoPedidos: ComandaCompleta[] = []; 
  listosPedidos: ComandaCompleta[] = [];
  
  // Vista aplanada (Items individuales)
  itemsPendientes: ItemCocina[] = [];
  itemsPreparando: ItemCocina[] = [];

  // Variables UI
  nombreChef: string = '';
  horaActual: string = '';
  conteoPendientes: number = 0;
  conteoPreparando: number = 0;
  conteoListos: number = 0;

  private subscriptions = new Subscription();

  constructor(
    private socketService: SocketService,
    private pedidosService: PedidosService,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone
  ) {
    this.nombreChef = this.authService.getNombreUsuario() || 'Chef';
    this.actualizarReloj();
    setInterval(() => this.actualizarReloj(), 1000);
    setInterval(() => this.recalcularTiempos(), 60000); 
  }

  ngOnInit(): void {
    this.cargarPedidos();
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
             if (pedido && pedido.items) this.procesarPedidoEntrante(pedido as any);
             else this.cargarPedidos();
        });
      })
    );
  }

  // ✅ FILTRO PRINCIPAL: Solo aceptamos items que NO sean de BARRA
  esItemDeCocina(item: any): boolean {
      if (item.destino) {
          return item.destino === 'COCINA';
      }
      if (item.producto?.destino) {
          return item.producto.destino === 'COCINA';
      }
      return item.producto?.destino !== 'BARRA';
  }

  distribuirPedidos(pedidos: any[]) {
    const nuevos: ComandaCompleta[] = [];
    const enPrep: ComandaCompleta[] = [];
    const listos: ComandaCompleta[] = [];

    pedidos.forEach(p => {
        const tieneComida = p.items.some((item: any) => this.esItemDeCocina(item));
        
        if (tieneComida) {
            if (p.estado === 'PENDIENTE') nuevos.push(p);
            else if (p.estado === 'EN_PREPARACION') enPrep.push(p);
            else if (p.estado === 'LISTA') listos.push(p);
        }
    });

    this.nuevosPedidos = nuevos;
    this.preparandoPedidos = enPrep;
    this.listosPedidos = listos;
    this.actualizarListasVisuales();
  }

  procesarPedidoEntrante(pedido: any) {
    const tieneComida = pedido.items.some((item: any) => this.esItemDeCocina(item));
    if (!tieneComida) return; 
    
    const yaExiste = [...this.nuevosPedidos, ...this.preparandoPedidos, ...this.listosPedidos].some(p => p.id === pedido.id);
    if (yaExiste) return;

    if (pedido.estado === 'PENDIENTE') this.nuevosPedidos.push(pedido);
    else if (pedido.estado === 'EN_PREPARACION') this.preparandoPedidos.push(pedido);
    else if (pedido.estado === 'LISTA') this.listosPedidos.push(pedido);
    
    this.actualizarListasVisuales();
  }

  // Transformar datos para las tarjetas visuales
  actualizarListasVisuales() {
      this.itemsPendientes = [];
      this.itemsPreparando = [];
      
      // ✅ CORRECCIÓN AQUÍ: Usamos ItemCocina en lugar de ItemVisual
      const procesarLista = (listaPedidos: any[], listaVisual: ItemCocina[]) => {
          listaPedidos.forEach(pedido => {
              const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || (pedido as any).fecha || new Date();
              const horaInicio = new Date(fechaOrigen);
              
              pedido.items.forEach((item: any, index: number) => {
                  if (this.esItemDeCocina(item)) {
                      listaVisual.push({
                          pedidoId: pedido.id,
                          itemId: index,
                          productoNombre: item.producto.nombre,
                          cantidad: item.cantidad,
                          mesaNumero: pedido.mesa?.numero || 'S/N',
                          tiempo: this.getMinutosTranscurridos(horaInicio),
                          notas: item.notas,
                          opciones: item.opcionesElegidas,
                          horaInicio: horaInicio
                      });
                  }
              });
          });
      };

      procesarLista(this.nuevosPedidos, this.itemsPendientes);
      procesarLista(this.preparandoPedidos, this.itemsPreparando);

      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoPreparando = this.itemsPreparando.length;
      this.conteoListos = this.listosPedidos.length;
  }

  // Acciones de Cocina
  empezarPreparacion(itemVisual: ItemCocina) {
      // Mover visualmente a "Preparando"
      const item = this.itemsPendientes.find(i => i.pedidoId === itemVisual.pedidoId && i.itemId === itemVisual.itemId);
      if(item) {
          this.itemsPendientes = this.itemsPendientes.filter(i => i !== item);
          this.itemsPreparando.push(item);
      }
      
      this.pedidosService.actualizarEstado(itemVisual.pedidoId, 'EN_PREPARACION').subscribe();
  }

  terminarPreparacion(itemVisual: ItemCocina) {
      // Quitar de preparación
      this.itemsPreparando = this.itemsPreparando.filter(i => 
          !(i.pedidoId === itemVisual.pedidoId && i.itemId === itemVisual.itemId)
      );
      this.conteoPreparando = this.itemsPreparando.length;

      // Verificar si quedan items pendientes de esa orden en cocina
      const quedanItems = this.itemsPreparando.some(i => i.pedidoId === itemVisual.pedidoId) || 
                          this.itemsPendientes.some(i => i.pedidoId === itemVisual.pedidoId);

      if (!quedanItems) {
          // Orden lista para entregar
          this.pedidosService.actualizarEstado(itemVisual.pedidoId, 'LISTA').subscribe({
              next: () => this.cargarPedidos()
          });
      }
  }

  getMinutosTranscurridos(fecha: Date): number {
      const diff = new Date().getTime() - new Date(fecha).getTime();
      return Math.floor(diff / 60000);
  }

  recalcularTiempos() {
      [...this.itemsPendientes, ...this.itemsPreparando].forEach(item => {
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