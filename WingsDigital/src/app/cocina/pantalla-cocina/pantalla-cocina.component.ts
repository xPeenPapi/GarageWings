import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // Importamos HttpClient directo si falta en servicio
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { SocketService, ComandaCompleta } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { PedidosService } from '../../services/pedidos.service';
import { environment } from '../../../environments/environment';

// Interfaz para la vista
interface ItemCocina {
  pedidoId: number;
  itemId: number; // ID real del item en base de datos
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

  // Datos
  nuevosPedidos: ComandaCompleta[] = [];
  preparandoPedidos: ComandaCompleta[] = []; 
  listosPedidos: ComandaCompleta[] = [];
  
  itemsPendientes: ItemCocina[] = [];
  itemsPreparando: ItemCocina[] = [];

  // UI
  nombreChef: string = '';
  horaActual: string = '';
  conteoPendientes: number = 0;
  conteoPreparando: number = 0;
  conteoListos: number = 0;

  private subscriptions = new Subscription();
  private apiUrl = `${environment.apiUrl}/pedidos`; // Ajusta según tu API

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
      next: (pedidos) => this.distribuirPedidos(pedidos),
      error: (err) => console.error(err)
    });
  }

  conectarSocket() {
    if (!this.socketService.isConnected()) this.socketService.reconnect();
    this.subscriptions.add(
      this.socketService.escucharNuevosPedidos().subscribe((pedido) => {
        this.zone.run(() => this.cargarPedidos()); // Recargar todo para asegurar consistencia
      })
    );
  }

  // ✅ FILTRO MEJORADO: ¿Es comida Y no está lista todavía?
  esItemCocinaPendiente(item: any): boolean {
    const esCocina = item.destino === 'COCINA' || item.producto?.destino === 'COCINA' || item.producto?.destino !== 'BARRA';
    const noEstaListo = item.estado !== 'LISTA' && item.estado !== 'ENTREGADA';
    return esCocina && noEstaListo;
  }

  // ✅ FILTRO MEJORADO: ¿Es comida Y ya está lista?
  esItemCocinaListo(item: any): boolean {
    const esCocina = item.destino === 'COCINA' || item.producto?.destino === 'COCINA' || item.producto?.destino !== 'BARRA';
    return esCocina && item.estado === 'LISTA';
  }

  distribuirPedidos(pedidos: any[]) {
    const nuevos: ComandaCompleta[] = [];
    const enPrep: ComandaCompleta[] = [];
    const listos: ComandaCompleta[] = [];

    pedidos.forEach(p => {
        // 1. Revisar si hay items de cocina PENDIENTES
        const tienePendientes = p.items.some((i: any) => this.esItemCocinaPendiente(i) && (p.estado === 'PENDIENTE' || !i.estado || i.estado === 'PENDIENTE'));
        
        // 2. Revisar si hay items de cocina PREPARANDO
        const tienePreparando = p.items.some((i: any) => this.esItemCocinaPendiente(i) && (p.estado === 'EN_PREPARACION' || i.estado === 'EN_PREPARACION'));
        
        // 3. Revisar si hay items de cocina LISTOS (para el historial)
        const tieneListos = p.items.some((i: any) => this.esItemCocinaListo(i));

        // Lógica de asignación (prioridad a lo crudo)
        if (tienePreparando) {
            enPrep.push(p);
        } else if (tienePendientes) {
            nuevos.push(p);
        } else if (tieneListos && p.estado !== 'ENTREGADA') {
            // Solo lo mostramos en listos si ya no tiene nada pendiente en cocina
            listos.push(p);
        }
    });

    this.nuevosPedidos = nuevos;
    this.preparandoPedidos = enPrep;
    this.listosPedidos = listos;
    this.actualizarListasVisuales();
  }

  actualizarListasVisuales() {
      this.itemsPendientes = [];
      this.itemsPreparando = [];
      
      const procesarLista = (listaPedidos: any[], listaVisual: ItemCocina[], estadoFiltro: string) => {
          listaPedidos.forEach(pedido => {
              const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || new Date();
              const horaInicio = new Date(fechaOrigen);
              
              pedido.items.forEach((item: any) => {
                  // Mostrar solo si es de cocina y coincide con el estado visual deseado
                  // OJO: Aquí asumimos que si la orden está en "Nuevos", mostramos sus items pendientes
                  if (this.esItemCocinaPendiente(item)) {
                       // Si la orden está en 'preparando', solo mostramos items preparando (o pendientes si queremos arrastrarlos todos)
                       // Para simplificar: mostramos todo lo pendiente de cocina
                       
                       const visualItem: ItemCocina = {
                          pedidoId: pedido.id,
                          itemId: item.id, // ID ÚNICO DEL ITEM
                          productoNombre: item.producto.nombre,
                          cantidad: item.cantidad,
                          mesaNumero: pedido.mesa?.numero || 'S/N',
                          tiempo: this.getMinutosTranscurridos(horaInicio),
                          notas: item.notas,
                          opciones: item.opcionesElegidas,
                          horaInicio: horaInicio
                      };

                      // Decidir en qué columna va basado en el estado DEL ITEM (si existe) o de la ORDEN
                      const estadoItem = item.estado || pedido.estado;
                      
                      if (estadoItem === 'EN_PREPARACION') {
                          if (estadoFiltro === 'PREPARANDO') this.itemsPreparando.push(visualItem);
                      } else {
                          if (estadoFiltro === 'PENDIENTE') this.itemsPendientes.push(visualItem);
                      }
                  }
              });
          });
      };

      // Procesamos todo junto para evitar duplicados visuales complejos
      const todosLosPedidosActivos = [...this.nuevosPedidos, ...this.preparandoPedidos];
      
      // Limpiamos y rellenamos
      this.itemsPendientes = [];
      this.itemsPreparando = [];

      todosLosPedidosActivos.forEach(pedido => {
          const horaInicio = new Date((pedido as any).createdAt || new Date());
          pedido.items.forEach((item: any) => {
              if (this.esItemCocinaPendiente(item)) {
                   const visualItem = {
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

                  if (item.estado === 'EN_PREPARACION' || pedido.estado === 'EN_PREPARACION') {
                      // Evitar duplicados si ya está
                      if(!this.itemsPreparando.find(i => i.itemId === item.id)) 
                         this.itemsPreparando.push(visualItem);
                  } else {
                      if(!this.itemsPendientes.find(i => i.itemId === item.id))
                         this.itemsPendientes.push(visualItem);
                  }
              }
          });
      });

      this.conteoPendientes = this.itemsPendientes.length;
      this.conteoPreparando = this.itemsPreparando.length;
      this.conteoListos = this.listosPedidos.length;
  }

  // --- ACCIONES QUE CORRIGEN EL PROBLEMA ---

  empezarPreparacion(itemVisual: ItemCocina) {
      // 1. Optimistic UI
      const item = this.itemsPendientes.find(i => i.itemId === itemVisual.itemId);
      if(item) {
          this.itemsPendientes = this.itemsPendientes.filter(i => i !== item);
          this.itemsPreparando.push(item);
      }
      
      // 2. Actualizar estado de LA ORDEN a 'EN_PREPARACION' (para que sepan que cocina trabaja)
      // Y actualizar estado del ITEM a 'EN_PREPARACION'
      this.actualizarEstadoItem(itemVisual.itemId, 'EN_PREPARACION');
      this.pedidosService.actualizarEstado(itemVisual.pedidoId, 'EN_PREPARACION').subscribe();
  }

  terminarPreparacion(itemVisual: ItemCocina) {
      // 1. Quitar de la vista "Preparando"
      this.itemsPreparando = this.itemsPreparando.filter(i => i.itemId !== itemVisual.itemId);
      this.conteoPreparando = this.itemsPreparando.length;

      // 2. ACTUALIZAR EL ITEM A 'LISTA' (NO LA ORDEN ENTERA AÚN)
      this.actualizarEstadoItem(itemVisual.itemId, 'LISTA').add(() => {
          // 3. VERIFICACIÓN INTELIGENTE:
          // ¿Queda algo pendiente en esta orden (Bebida o Comida)?
          this.verificarCierreOrden(itemVisual.pedidoId);
      });
  }

  // 🔥 LA CLAVE: Función para actualizar items individuales
  // Si tu backend no tiene esta ruta, avísame, pero es necesaria para la independencia.
  actualizarEstadoItem(itemId: number, estado: string) {
      return this.http.patch(`${this.apiUrl}/items/${itemId}`, { estado }).subscribe({
          next: () => console.log(`Item ${itemId} actualizado a ${estado}`),
          error: (err) => console.error('Error actualizando item', err)
      });
  }

  // 🔥 LA MAGIA: Verifica si cierra toda la orden
  verificarCierreOrden(pedidoId: number) {
      // Obtenemos la orden fresca para ver cómo van los de la Barra
      this.pedidosService.getOrden(pedidoId).subscribe((orden: any) => {
          const todosListos = orden.items.every((i: any) => i.estado === 'LISTA' || i.estado === 'ENTREGADA');
          
          if (todosListos) {
              // ¡Solo ahora cerramos la mesa completa!
              this.pedidosService.actualizarEstado(pedidoId, 'LISTA').subscribe(() => {
                  this.cargarPedidos(); // Refrescar para mover a columna Listos
              });
          } else {
              // Si falta algo (ej. barra), solo recargamos para actualizar mi vista
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