import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, interval, forkJoin } from 'rxjs'; // ✅ Agregado forkJoin
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
  
  // VISTAS APLANADAS
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

  // 1. CARGA DE DATOS
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

  // ==============================================================================
  // 🔥🔥🔥 FILTRO BLINDADO ANTI-BEBIDAS (4 CAPAS DE SEGURIDAD) 🔥🔥🔥
  // ==============================================================================
  esItemDeCocina(item: any): boolean {
    // 🔍 DEBUG: Información completa del item para rastreo
    // const infoDebug = {
    //   nombre: item.producto?.nombre,
    //   itemDestino: item.destino,
    //   productoDestino: item.producto?.destino,
    //   categoria: item.producto?.categoria?.nombre,
    //   estado: item.estado
    // };
    // console.log('🔍 Evaluando item:', infoDebug);

    // CAPA 1: Destino del ITEM (Campo directo en la orden)
    if (item.destino) {
      const destinoItem = String(item.destino).toUpperCase();
      if (destinoItem === 'BARRA') return false;
      if (destinoItem === 'COCINA') return true;
    }

    // CAPA 2: Destino del PRODUCTO (Configuración del catálogo)
    if (item.producto?.destino) {
      const destinoProducto = String(item.producto.destino).toUpperCase();
      if (destinoProducto === 'BARRA') return false;
      if (destinoProducto === 'COCINA') return true;
    }

    // CAPA 3: Filtro por NOMBRE (Palabras clave prohibidas en cocina)
    const nombre = (item.producto?.nombre || '').toLowerCase();
    const palabrasProhibidas = [
      // Bebidas generales
      'bebida', 'refresco', 'agua', 'jugo', 'nectar', 'soda',
      // Cervezas
      'cerveza', 'corona', 'modelo', 'tecate', 'victoria', 'indio', 'pacifico', 'bohemia', 'heineken', 'stella', 'dos equis',
      // Gaseosas
      'coca', 'pepsi', 'sprite', 'fanta', 'manzanita', 'squirt', 'sidral', 'fresca', 'mirinda',
      // Calientes / Café / Té
      'cafe', 'café', 'capuchino', 'latte', 'espresso', 'americano', 'te ', 'té ', 'tisana', 'infusion',
      // Alcohol / Coctelería
      'coctel', 'cóctel', 'margarita', 'mojito', 'daiquiri', 'caipirinha', 'piña colada', 'tequila', 'vodka', 'ron', 'whisky', 'ginebra', 'mezcal',
      // Otros envases
      'michelada', 'chelada', 'clamato', 'vino', 'champagne', 'copa', 'trago', 'shot', 'botella', 'lata', 'barril', 'smoothie', 'frappe', 'malteada', 'limonada', 'naranjada', 'horchata', 'jamaica'
    ];

    if (palabrasProhibidas.some(p => nombre.includes(p))) {
      // console.log(`❌ BLOQUEADO POR NOMBRE: "${item.producto?.nombre}"`);
      return false;
    }

    // CAPA 4: Filtro por CATEGORÍA
    const categoria = (item.producto?.categoria?.nombre || '').toLowerCase();
    const categoriasProhibidas = [
      'bebida', 'cerveza', 'refresco', 'coctel', 'cóctel', 'licor', 'barra', 'bar', 'vino', 'cafe', 'café', 'tragos'
    ];

    if (categoriasProhibidas.some(c => categoria.includes(c))) {
      // console.log(`❌ BLOQUEADO POR CATEGORÍA: "${categoria}"`);
      return false;
    }

    // ✅ Si pasó TODOS los filtros → Es comida
    return true;
  }

  // ==============================================================================
  // 🚜 PROCESADOR VISUAL (Clasifica items en columnas)
  // ==============================================================================
  procesarListasVisuales() {
    // console.log('🔄 ===== PROCESANDO LISTAS COCINA =====');
    
    this.itemsPendientes = [];
    this.itemsPreparando = [];
    const mapaListos = new Map<number, any>();

    let itemsBloqueados = 0;
    let itemsAceptados = 0;

    this.todasLasOrdenes.forEach(pedido => {
        const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || new Date();
        const horaInicio = new Date(fechaOrigen);
        
        pedido.items.forEach((item: any) => {
            // ✅ APLICAR EL FILTRO BLINDADO
            const esParaCocina = this.esItemDeCocina(item);
            
            if (!esParaCocina) {
                itemsBloqueados++;
                return; // No es de cocina, lo ignoramos
            }

            itemsAceptados++;

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
                    // Agrupamos para mostrar en el historial "Mesa 1: Hamburguesa (Listo)"
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

    // console.log(`📊 Reporte: ${itemsAceptados} aceptados, ${itemsBloqueados} bebidas bloqueadas.`);
  }

  // ==============================================================================
  // ⚡ ACCIONES (Botones)
  // ==============================================================================

  empezarPreparacion(itemVisual: ItemCocina) {
      // 1. UI Optimista (Mover tarjeta instantáneamente)
      const index = this.itemsPendientes.findIndex(i => i.itemId === itemVisual.itemId);
      if (index !== -1) {
          const item = this.itemsPendientes[index];
          this.itemsPendientes.splice(index, 1);
          this.itemsPreparando.push(item);
      }
      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoPreparando = this.itemsPreparando.length;

      // 2. Llamada al Backend
      this.http.patch(`${this.apiUrl}/items/${itemVisual.itemId}`, { estado: 'EN_PREPARACION' })
          .subscribe({ error: (e) => console.error(e) });
  }

  terminarPreparacion(itemVisual: ItemCocina) {
      // 1. UI Optimista
      const index = this.itemsPreparando.findIndex(i => i.itemId === itemVisual.itemId);
      if (index !== -1) {
          this.itemsPreparando.splice(index, 1);
      }
      this.conteoPreparando = this.itemsPreparando.length;
      
      // 2. Llamada al Backend
      this.http.patch(`${this.apiUrl}/items/${itemVisual.itemId}`, { estado: 'LISTA' }).subscribe({
          next: () => {
              this.cargarPedidos(); // Recargar para mover a "Listos" y verificar cierre de orden
          }
      });
  }

  // ✅ FUNCIÓN PARA EL BOTÓN "CHECK" (LIMPIAR PANTALLA)
  // Cambia el estado de LISTA a ENTREGADA, haciendo que desaparezca de la cocina.
  limpiarOrdenLista(pedidoVisual: any) {
      if (!pedidoVisual || !pedidoVisual.items) return;

      // Creamos un array de peticiones para actualizar todos los items de esa tarjeta
      const peticiones = pedidoVisual.items.map((item: any) => {
          return this.http.patch(`${this.apiUrl}/items/${item.id}`, { estado: 'ENTREGADA' });
      });

      // Ejecutamos todas las peticiones en paralelo
      forkJoin(peticiones).subscribe({
          next: () => {
              // Recargamos para que la tarjeta desaparezca de la columna "Listos"
              this.cargarPedidos();
          },
          error: (err) => console.error('Error al limpiar orden', err)
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