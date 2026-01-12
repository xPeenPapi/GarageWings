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



esItemDeCocina(item: any): boolean {
  // ========================================
  // 🔍 DEBUG: Información completa del item
  // ========================================
  const infoDebug = {
    nombre: item.producto?.nombre,
    itemDestino: item.destino,
    productoDestino: item.producto?.destino,
    categoria: item.producto?.categoria?.nombre,
    estado: item.estado
  };
  
  console.log('🔍 Evaluando item:', infoDebug);

  // ========================================
  // CAPA 1: Destino del ITEM (campo en ItemOrden)
  // ========================================
  if (item.destino) {
    const destinoItem = String(item.destino).toUpperCase();
    
    if (destinoItem === 'BARRA') {
      console.log(`❌ BLOQUEADO: "${item.producto?.nombre}" → item.destino = BARRA`);
      return false;
    }
    
    if (destinoItem === 'COCINA') {
      console.log(`✅ ACEPTADO: "${item.producto?.nombre}" → item.destino = COCINA`);
      return true;
    }
  }

  // ========================================
  // CAPA 2: Destino del PRODUCTO (campo en Producto)
  // ========================================
  if (item.producto?.destino) {
    const destinoProducto = String(item.producto.destino).toUpperCase();
    
    if (destinoProducto === 'BARRA') {
      console.log(`❌ BLOQUEADO: "${item.producto?.nombre}" → producto.destino = BARRA`);
      return false;
    }
    
    if (destinoProducto === 'COCINA') {
      console.log(`✅ ACEPTADO: "${item.producto?.nombre}" → producto.destino = COCINA`);
      return true;
    }
  }

  // ========================================
  // CAPA 3: Filtro por NOMBRE (para items sin destino)
  // ========================================
  const nombre = (item.producto?.nombre || '').toLowerCase();
  
  const palabrasProhibidas = [
    // Bebidas generales
    'bebida', 'refresco', 'agua', 'jugo', 'nectar', 'soda',
    
    // Cervezas (marcas específicas)
    'cerveza', 'corona', 'modelo', 'tecate', 'victoria', 'indio',
    'pacifico', 'bohemia', 'heineken', 'stella', 'dos equis',
    
    // Gaseosas
    'coca', 'pepsi', 'sprite', 'fanta', 'manzanita', 
    'squirt', 'sidral', 'fresca', 'mirinda',
    
    // Bebidas calientes
    'cafe', 'café', 'capuchino', 'latte', 'espresso', 'americano',
    'te ', 'té ', 'tisana', 'infusion', 'infusión',
    
    // Cocteles y licores
    'coctel', 'cóctel', 'margarita', 'mojito', 'daiquiri',
    'caipirinha', 'piña colada', 'tequila', 'vodka',
    'ron', 'whisky', 'whiskey', 'ginebra', 'mezcal',
    
    // Otros
    'michelada', 'chelada', 'clamato', 'vino', 'champagne',
    'copa', 'trago', 'shot', 'botella', 'lata', 'barril',
    'smoothie', 'frappe', 'frappé', 'batido', 'malteada',
    'limonada', 'naranjada', 'horchata', 'jamaica'
  ];

  if (palabrasProhibidas.some(p => nombre.includes(p))) {
    console.log(`❌ BLOQUEADO: "${item.producto?.nombre}" → nombre contiene palabra de bebida`);
    return false;
  }

  // ========================================
  // CAPA 4: Filtro por CATEGORÍA
  // ========================================
  const categoria = (item.producto?.categoria?.nombre || '').toLowerCase();
  
  const categoriasProhibidas = [
    'bebida', 'cerveza', 'refresco', 'coctel', 'cóctel', 
    'licor', 'barra', 'bar', 'vino', 'cafe', 'café', 'tragos'
  ];

  if (categoriasProhibidas.some(c => categoria.includes(c))) {
    console.log(`❌ BLOQUEADO: "${item.producto?.nombre}" → categoría "${categoria}" es de bebidas`);
    return false;
  }

  // ========================================
  // ✅ Si pasó TODOS los filtros → Es comida
  // ========================================
  console.log(`✅ ACEPTADO: "${item.producto?.nombre}" → pasó todos los filtros (es comida)`);
  return true;
}

// 🔥 Reemplaza procesarListasVisuales() en pantalla-cocina.component.ts

procesarListasVisuales() {
    console.log('🔄 ===== PROCESANDO LISTAS COCINA =====');
    console.log(`📦 Total órdenes recibidas: ${this.todasLasOrdenes.length}`);
    
    this.itemsPendientes = [];
    this.itemsPreparando = [];
    const mapaListos = new Map<number, any>();

    let itemsBloqueados = 0;
    let itemsAceptados = 0;

    this.todasLasOrdenes.forEach(pedido => {
        const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || new Date();
        const horaInicio = new Date(fechaOrigen);
        
        console.log(`📋 Orden #${pedido.id} - Mesa: ${pedido.mesa?.numero || 'S/N'} - Items: ${pedido.items.length}`);
        
        pedido.items.forEach((item: any) => {
            // ✅ APLICAR FILTRO (con logs incluidos)
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

    console.log('📊 ===== RESUMEN COCINA =====');
    console.log(`✅ Items aceptados: ${itemsAceptados}`);
    console.log(`❌ Items bloqueados: ${itemsBloqueados}`);
    console.log(`📋 Pendientes: ${this.conteoPendientes}`);
    console.log(`👨‍🍳 Preparando: ${this.conteoPreparando}`);
    console.log(`🍽️ Listos: ${this.conteoListos}`);
    console.log('=====================================\n');
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