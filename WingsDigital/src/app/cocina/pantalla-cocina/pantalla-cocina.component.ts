import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { SocketService, ComandaCompleta } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { PedidosService } from '../../services/pedidos.service';
import { environment } from '../../../environments/environment';

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
  todasLasOrdenes: ComandaCompleta[] = [];
  
  itemsPendientes: ItemCocina[] = [];
  itemsPreparando: ItemCocina[] = [];
  listosPedidos: any[] = [];

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
    this.subscriptions.add(interval(10000).subscribe(() => this.cargarPedidos()));
    this.conectarSocket();
  }

  setActiveTab(tab: MobileTab) { this.activeMobileTab = tab; }

  actualizarReloj() {
    const now = new Date();
    this.horaActual = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  cargarPedidos() {
    this.pedidosService.obtenerPendientes().subscribe({
      next: (pedidos) => {
        this.todasLasOrdenes = pedidos;
        this.procesarListasVisuales();
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

  // 🔥🔥🔥 FILTRO BLINDADO ANTI-BEBIDAS 🔥🔥🔥
esItemDeCocina(item: any): boolean {
  // ========================================
  // POLÍTICA: Solo entra lo que EXPLÍCITAMENTE dice "COCINA"
  // Si tiene destino NULL o es ambiguo -> BLOQUEADO
  // ========================================

  // CAPA 1: Revisar etiqueta directa del item (Máxima Prioridad)
  if (item.destino === 'COCINA') return true;   // ✅ Sí es de cocina
  if (item.destino === 'BARRA') return false;   // ❌ Es de barra
  
  // CAPA 2: Revisar configuración del producto
  if (item.producto?.destino === 'COCINA') return true;
  if (item.producto?.destino === 'BARRA') return false;

  // ========================================
  // CAPA 3: Si llegamos aquí, el destino es NULL/undefined
  // NUEVO ENFOQUE: Bloqueamos TODO lo que parezca bebida
  // ========================================
  
  const nombre = (item.producto?.nombre || '').toLowerCase();
  
  // Lista expandida de palabras que indican BEBIDA
  const palabrasProhibidas = [
    // Bebidas generales
    'bebida', 'refresco', 'agua', 'jugo', 'nectar',
    
    // Gaseosas
    'coca', 'pepsi', 'sprite', 'fanta', 'manzanita', 
    'squirt', 'sidral', 'fresca',
    
    // Cervezas
    'cerveza', 'corona', 'modelo', 'victoria', 'indio',
    'pacifico', 'bohemia', 'heineken', 'stella',
    
    // Bebidas calientes
    'cafe', 'café', 'capuchino', 'latte', 'espresso',
    'te ', 'té ', 'tisana', 'infusion',
    
    // Cocteles y licores
    'coctel', 'margarita', 'piña colada', 'mojito',
    'daiquiri', 'caipirinha', 'tequila', 'vodka',
    'ron', 'whisky', 'ginebra', 'mezcal',
    
    // Otros
    'michelada', 'chelada', 'clamato', 'vino',
    'copa', 'trago', 'shot', 'botella', 'lata',
    'smoothie', 'frappe', 'batido', 'limonada',
    'naranjada', 'horchata', 'jamaica'
  ];

  // Si contiene alguna palabra prohibida -> BLOQUEAR
  if (palabrasProhibidas.some(p => nombre.includes(p))) {
    console.warn(`🚫 BLOQUEADO en cocina: "${nombre}" (parece bebida)`);
    return false;
  }

  // ========================================
  // CAPA 4 (NUEVA): Validación por categoría
  // ========================================
  const categoria = (item.producto?.categoria?.nombre || '').toLowerCase();
  
  const categoriasProhibidas = [
    'bebida', 'cerveza', 'refresco', 'coctel', 'licor',
    'barra', 'vino', 'cafe', 'café', 'bar', 'tragos'
  ];

  if (categoriasProhibidas.some(c => categoria.includes(c))) {
    console.warn(`🚫 BLOQUEADO en cocina: "${nombre}" (categoría: ${categoria})`);
    return false;
  }

  // ========================================
  // Si pasó TODAS las validaciones -> SÍ es comida
  // ========================================
  console.log(`✅ Aceptado en cocina: "${nombre}"`);
  return true;
}

  procesarListasVisuales() {
      this.itemsPendientes = [];
      this.itemsPreparando = [];
      const mapaListos = new Map<number, any>();

      this.todasLasOrdenes.forEach(pedido => {
          const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || new Date();
          const horaInicio = new Date(fechaOrigen);
          
          pedido.items.forEach((item: any) => {
              // 1. APLICAMOS EL FILTRO BLINDADO
              if (!this.esItemDeCocina(item)) return;

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

              switch (item.estado) {
                  case 'PENDIENTE':
                      this.itemsPendientes.push(visualItem);
                      break;
                  case 'EN_PREPARACION':
                      this.itemsPreparando.push(visualItem);
                      break;
                  case 'LISTA':
                      if (!mapaListos.has(pedido.id)) {
                          mapaListos.set(pedido.id, { 
                              ...pedido, 
                              items: [] 
                          });
                      }
                      mapaListos.get(pedido.id).items.push(item);
                      break;
              }
          });
      });

      this.listosPedidos = Array.from(mapaListos.values());
      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoPreparando = this.itemsPreparando.length;
      this.conteoListos = this.listosPedidos.length;
  }

  empezarPreparacion(itemVisual: ItemCocina) {
      const index = this.itemsPendientes.findIndex(i => i.itemId === itemVisual.itemId);
      if (index !== -1) {
          const item = this.itemsPendientes[index];
          this.itemsPendientes.splice(index, 1);
          this.itemsPreparando.push(item);
      }
      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoPreparando = this.itemsPreparando.length;

      this.http.patch(`${this.apiUrl}/items/${itemVisual.itemId}`, { estado: 'EN_PREPARACION' })
          .subscribe({ error: (e) => console.error(e) });
  }

  terminarPreparacion(itemVisual: ItemCocina) {
      const index = this.itemsPreparando.findIndex(i => i.itemId === itemVisual.itemId);
      if (index !== -1) {
          this.itemsPreparando.splice(index, 1);
      }
      this.conteoPreparando = this.itemsPreparando.length;
      
      this.http.patch(`${this.apiUrl}/items/${itemVisual.itemId}`, { estado: 'LISTA' }).subscribe({
          next: () => {
              this.cargarPedidos(); 
          }
      });
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

  salir() { this.authService.logout(); this.router.navigate(['/login']); }
  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
}