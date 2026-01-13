import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, interval, forkJoin, of } from 'rxjs'; // ✅ Agregado 'of'
import { catchError } from 'rxjs/operators'; // ✅ Importante para manejo de errores
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
  
  // 🏢 SUCURSAL DEL USUARIO
  sucursalId: number | null = null;

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
    this.sucursalId = this.authService.getSucursalId();
    console.log('🏢 Cocina de sucursal:', this.sucursalId);
    
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

  // 1. CARGA DE DATOS (Filtrar por sucursal)
  cargarPedidos() {
    this.pedidosService.obtenerPendientes().subscribe({
      next: (pedidos) => {
        // 🏢 FILTRAR POR SUCURSAL
        if (this.sucursalId) {
          this.todasLasOrdenes = pedidos.filter((p: any) => {
            // Verificar si el pedido tiene mesa y que la mesa pertenezca a la sucursal
            if (p.mesa && p.mesa.sucursalId) {
              return Number(p.mesa.sucursalId) === Number(this.sucursalId);
            }
            // Si no tiene mesa (para llevar), verificar si el pedido tiene sucursalId
            if (p.sucursalId) {
              return Number(p.sucursalId) === Number(this.sucursalId);
            }
            return false;
          });
          console.log(`🏢 Pedidos filtrados para sucursal ${this.sucursalId}:`, this.todasLasOrdenes.length);
        } else {
          this.todasLasOrdenes = pedidos;
        }
        
        this.procesarListasVisuales(); // 🔥 Aquí ocurre la magia de filtrado y ordenamiento
      },
      error: (err) => console.error('Error cargando pedidos:', err)
    });
  }

  conectarSocket() {
    if (!this.socketService.isConnected()) this.socketService.reconnect();
    
    // 🔥 IMPORTANTE: Escuchar cambios para que cuando el mesero entregue, se quite de aquí.
    // También actualiza cuando llega una nueva orden.
    this.subscriptions.add(
      this.socketService.escucharNuevosPedidos().subscribe(() => {
        console.log('🔔 Cambio detectado por Socket (Nuevo/Entregado/Cancelado)');
        this.zone.run(() => this.cargarPedidos());
      })
    );
  }

  // ==============================================================================
  // 🔥🔥🔥 FILTRO BLINDADO ANTI-BEBIDAS (4 CAPAS DE SEGURIDAD) 🔥🔥🔥
  // ==============================================================================
  esItemDeCocina(item: any): boolean {
    // CAPA 1: Destino del ITEM (Campo directo en la orden)
    if (item.destino) {
      const destinoItem = String(item.destino).toUpperCase();
      if (destinoItem === 'BARRA') return false; // Si dice BARRA, adiós.
      if (destinoItem === 'COCINA') return true;
    }

    // CAPA 2: Destino del PRODUCTO (Configuración del catálogo)
    if (item.producto?.destino) {
      const destinoProducto = String(item.producto.destino).toUpperCase();
      if (destinoProducto === 'BARRA') return false;
      if (destinoProducto === 'COCINA') return true;
    }

    // CAPA 3: Filtro por NOMBRE (Palabras clave prohibidas en cocina - Fallback)
    // Si llegamos aquí, el destino es NULL. Verificamos si parece bebida por su nombre.
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
      return false;
    }

    // CAPA 4: Filtro por CATEGORÍA
    const categoria = (item.producto?.categoria?.nombre || '').toLowerCase();
    const categoriasProhibidas = [
      'bebida', 'cerveza', 'refresco', 'coctel', 'cóctel', 'licor', 'barra', 'bar', 'vino', 'cafe', 'café', 'tragos', 'cafeteria', 'licores'
    ];

    if (categoriasProhibidas.some(c => categoria.includes(c))) {
      return false;
    }

    // ✅ Si pasó TODOS los filtros → Es comida
    return true;
  }

  // ==============================================================================
  // 🚜 PROCESADOR VISUAL (Clasifica items en columnas)
  // ==============================================================================
  procesarListasVisuales() {
    this.itemsPendientes = [];
    this.itemsPreparando = [];
    const mapaListos = new Map<number, any>();

    this.todasLasOrdenes.forEach(pedido => {
        const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || new Date();
        const horaInicio = new Date(fechaOrigen);
        
        pedido.items.forEach((item: any) => {
            // ✅ APLICAR EL FILTRO BLINDADO
            // Solo nos interesa procesar items que sean responsabilidad de la cocina
            if (!this.esItemDeCocina(item)) return;

            const visualItem: ItemCocina = {
                pedidoId: pedido.id,
                itemId: item.id,
                productoNombre: item.producto.nombre,
                cantidad: item.cantidad,
                mesaNumero: pedido.mesa?.numero ? `Mesa ${pedido.mesa.numero}` : 'Pedido para llevar',
                tiempo: this.getMinutosTranscurridos(horaInicio),
                notas: item.notas,
                opciones: item.opcionesElegidas,
                horaInicio: horaInicio
            };

            // Clasificar según el estado DEL ITEM (Independiente de la Orden)
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
                
                // Si el estado es 'ENTREGADA', no hacemos nada (el item se ignora y desaparece de la vista)
            }
        });
    });

    // Convertimos el mapa de listos a array para el HTML y actualizamos contadores
    this.listosPedidos = Array.from(mapaListos.values());
    this.actualizarConteos();
  }

  // ==============================================================================
  // ⚡ ACCIONES (Botones)
  // ==============================================================================

  empezarPreparacion(itemVisual: ItemCocina) {
      // 1. UI Optimista (Mover tarjeta instantáneamente sin esperar al server)
      const index = this.itemsPendientes.findIndex(i => i.itemId === itemVisual.itemId);
      if (index !== -1) {
          const item = this.itemsPendientes[index];
          this.itemsPendientes.splice(index, 1);
          this.itemsPreparando.push(item);
      }
      this.actualizarConteos();

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
      this.actualizarConteos();
      
      // 2. Llamada al Backend
      // Al pasar a LISTA, el backend notificará al mesero vía socket.
      this.http.patch(`${this.apiUrl}/items/${itemVisual.itemId}`, { estado: 'LISTA' }).subscribe({
          next: () => {
              // 3. Recargamos para que el item aparezca en la columna "Listos"
              this.cargarPedidos(); 
          }
      });
  }

  // ✅ FUNCIÓN PARA EL BOTÓN "CHECK" (LIMPIAR PANTALLA / BACKUP)
  // Esta función es un respaldo por si el mesero no marca el plato como entregado.
  // Cambia el estado de 'LISTA' a 'ENTREGADA', haciendo que desaparezca de la cocina.
  limpiarOrdenLista(pedidoVisual: any) {
      if (!pedidoVisual || !pedidoVisual.items || pedidoVisual.items.length === 0) return;

      console.log(`🧹 Limpiando orden de mesa ${pedidoVisual.mesa?.numero}...`);

      // 1. FILTRAR: Solo items que sean de Cocina Y que estén en estado 'LISTA'
      // Esto es crucial para evitar errores. No intentamos tocar bebidas ni cosas ya entregadas.
      const itemsParaLimpiar = pedidoVisual.items.filter((item: any) => 
          this.esItemDeCocina(item) && item.estado === 'LISTA'
      );

      if (itemsParaLimpiar.length === 0) {
          console.log('⚠️ No hay items válidos para limpiar (quizás ya se entregaron o son bebidas). Recargando...');
          this.cargarPedidos();
          return;
      }

      // 2. Ejecutar actualizaciones de forma segura (una por una en paralelo)
      const peticiones = itemsParaLimpiar.map((item: any) => {
          return this.http.patch(`${this.apiUrl}/items/${item.id}`, { estado: 'ENTREGADA' }).pipe(
              catchError(error => {
                  console.warn(`Error limpiando item ${item.id}`, error);
                  return of(null); // Continuar aunque falle uno, evita que se rompa todo el proceso
              })
          );
      });

      // 3. Ejecutar todas las peticiones
      forkJoin(peticiones).subscribe({
          next: () => {
              // Al terminar, recargamos. Como ahora el estado es 'ENTREGADA', 
              // el procesador visual los ignorará y la tarjeta desaparecerá.
              this.cargarPedidos();
          },
          error: (err) => console.error('Error general al limpiar orden', err)
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

  actualizarConteos() {
      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoPreparando = this.itemsPreparando.length;
      this.conteoListos = this.listosPedidos.length;
  }

  salir() { this.authService.logout(); this.router.navigate(['/login']); }
  ngOnDestroy(): void { this.subscriptions.unsubscribe(); }
}