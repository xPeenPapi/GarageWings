import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { SocketService, ComandaCompleta } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { PedidosService } from '../../services/pedidos.service';
import { environment } from '../../../environments/environment';

// Interfaz para la vista (Item Individual)
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

type MobileTab = 'nuevos' | 'preparando' | 'listos';

@Component({
  selector: 'app-pantalla-cocina',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pantalla-cocina.component.html',
  styleUrls: ['./pantalla-cocina.component.css']
})
export class PantallaCocinaComponent implements OnInit, OnDestroy {
  
  activeMobileTab: MobileTab = 'nuevos';

  // Almacén de datos crudos (Todas las órdenes que tienen ALGO activo)
  todasLasOrdenes: ComandaCompleta[] = [];
  
  // VISTAS APLANADAS (Aquí está la clave: Listas de ITEMS, no de órdenes)
  itemsPendientes: ItemCocina[] = [];
  itemsPreparando: ItemCocina[] = [];
  listosPedidos: any[] = []; // Agrupado por orden para el historial

  // UI
  nombreChef: string = '';
  horaActual: string = '';
  conteoPendientes: number = 0;
  conteoPreparando: number = 0;
  conteoListos: number = 0;

  private subscriptions = new Subscription();
  private apiUrl = `${environment.apiUrl}/pedidos`; 

  constructor(
    private socketService: SocketService,
    private pedidosService: PedidosService,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone,
    private http: HttpClient
  ) {
    this.nombreChef = this.authService.getNombreUsuario() || 'Chef';
    this.actualizarReloj();
    setInterval(() => this.actualizarReloj(), 1000);
    setInterval(() => this.recalcularTiempos(), 60000); 
  }

  ngOnInit(): void {
    this.cargarPedidos();
    // Polling de seguridad cada 10s por si falla el socket
    this.subscriptions.add(interval(10000).subscribe(() => this.cargarPedidos()));
    this.conectarSocket();
  }

  setActiveTab(tab: MobileTab) { this.activeMobileTab = tab; }

  actualizarReloj() {
    const now = new Date();
    this.horaActual = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // 1. CARGA DE DATOS (Sin filtrar todavía)
  cargarPedidos() {
    this.pedidosService.obtenerPendientes().subscribe({
      next: (pedidos) => {
        this.todasLasOrdenes = pedidos;
        this.procesarListasVisuales(); // 🔥 Aquí ocurre la magia
      },
      error: (err) => console.error(err)
    });
  }

  conectarSocket() {
    if (!this.socketService.isConnected()) this.socketService.reconnect();
    this.subscriptions.add(
      this.socketService.escucharNuevosPedidos().subscribe(() => {
        this.zone.run(() => this.cargarPedidos());
      })
    );
  }

  // 2. FILTRO INTELIGENTE: ¿Es responsabilidad de Cocina?
  esItemDeCocina(item: any): boolean {
    // A. Si tiene la etiqueta nueva 'destino' (Gracias a la actualización de DB)
    if (item.destino) return item.destino === 'COCINA';
    
    // B. Fallback: Si no tiene etiqueta, miramos el producto
    if (item.producto?.destino) return item.producto.destino === 'COCINA';
    
    // C. Último recurso: Si no dice BARRA, es COCINA.
    return item.producto?.destino !== 'BARRA';
  }

  // 3. PROCESAMIENTO (Convierte Órdenes complejas en Lista de Tareas Simple)
  procesarListasVisuales() {
      this.itemsPendientes = [];
      this.itemsPreparando = [];
      const mapaListos = new Map<number, any>(); // Map para agrupar "Listos" por mesa

      this.todasLasOrdenes.forEach(pedido => {
          const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || new Date();
          const horaInicio = new Date(fechaOrigen);
          
          pedido.items.forEach((item: any) => {
              // PASO A: ¿Este item es mío (Cocina)?
              if (!this.esItemDeCocina(item)) return;

              // PASO B: Crear objeto visual
              const visualItem: ItemCocina = {
                  pedidoId: pedido.id,
                  itemId: item.id,
                  productoNombre: item.producto.nombre,
                  cantidad: item.cantidad,
                  mesaNumero: pedido.mesa?.numero || 'S/N',
                  tiempo: this.getMinutosTranscurridos(horaInicio),
                  notas: item.notas,
                  opciones: item.opcionesElegidas,
                  horaInicio: horaInicio
              };

              // PASO C: Clasificar según el estado DEL ITEM (Independiente de la Orden)
              switch (item.estado) {
                  case 'PENDIENTE':
                      this.itemsPendientes.push(visualItem);
                      break;
                  
                  case 'EN_PREPARACION':
                      this.itemsPreparando.push(visualItem);
                      break;
                  
                  case 'LISTA':
                      // Agrupamos para mostrar en el historial "Mesa 1: Hamburguesa (Listo)"
                      if (!mapaListos.has(pedido.id)) {
                          mapaListos.set(pedido.id, { 
                              ...pedido, 
                              items: [] // Reiniciamos items para meter solo los de cocina listos
                          });
                      }
                      mapaListos.get(pedido.id).items.push(item);
                      break;
                  
                  // Ignoramos 'ENTREGADA', 'CANCELADA' para no saturar
              }
          });
      });

      // Convertimos el mapa de listos a array para el HTML
      this.listosPedidos = Array.from(mapaListos.values());

      // Actualizamos contadores para las pestañas
      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoPreparando = this.itemsPreparando.length;
      this.conteoListos = this.listosPedidos.length;
  }

  // --- ACCIONES (Optimizadas para respuesta instantánea) ---

  empezarPreparacion(itemVisual: ItemCocina) {
      // 1. UI Optimista (Mover tarjeta instantáneamente sin esperar al server)
      const index = this.itemsPendientes.findIndex(i => i.itemId === itemVisual.itemId);
      if (index !== -1) {
          const item = this.itemsPendientes[index];
          this.itemsPendientes.splice(index, 1);
          this.itemsPreparando.push(item);
      }
      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoPreparando = this.itemsPreparando.length;

      // 2. Llamada al Backend (Solo actualiza ESTE item)
      this.http.patch(`${this.apiUrl}/items/${itemVisual.itemId}`, { estado: 'EN_PREPARACION' })
          .subscribe({ error: (e) => console.error(e) });
  }

  terminarPreparacion(itemVisual: ItemCocina) {
      // 1. UI Optimista (Quitar de pantalla instantáneamente)
      const index = this.itemsPreparando.findIndex(i => i.itemId === itemVisual.itemId);
      if (index !== -1) {
          this.itemsPreparando.splice(index, 1);
      }
      this.conteoPreparando = this.itemsPreparando.length;
      
      // 2. Llamada al Backend
      this.http.patch(`${this.apiUrl}/items/${itemVisual.itemId}`, { estado: 'LISTA' }).subscribe({
          next: () => {
              // 3. Al terminar, recargamos todo para ver si la orden completa se cierra
              // y para que aparezca en la columna "Listos"
              this.cargarPedidos(); 
          }
      });
  }

  // Auxiliares
  getMinutosTranscurridos(fecha: Date): number {
      const diff = new Date().getTime() - new Date(fecha).getTime();
      return Math.floor(diff / 60000);
  }

  recalcularTiempos() {
      [...this.itemsPendientes, ...this.itemsPreparando].forEach(item => {
          item.tiempo = this.getMinutosTranscurridos(item.horaInicio);
      });
  }

  salir() { this.authService.logout(); this.router.navigate(['/login']); }
  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
}