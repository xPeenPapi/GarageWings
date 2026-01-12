import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import { SocketService, ComandaCompleta } from '../../socket.service';
import { AuthService } from '../../auth.service';
import { PedidosService } from '../../pedidos.service';
import { environment } from '../../../../environments/environment';

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
  
  todasLasOrdenes: ComandaCompleta[] = [];
  itemsPendientes: ItemVisual[] = [];
  
  nombreBarista: string = '';
  horaActual: string = '';
  conteoPendientes: number = 0;
  conteoListas: number = 0;

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
    this.nombreBarista = this.authService.getNombreUsuario() || 'Barista';
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

  // 🔥 FILTRO BLINDADO PARA BARRA (igual que cocina)
  esItemDeBarra(item: any): boolean {
    console.log('🔍 [BARRA] Evaluando item:', {
      nombre: item.producto?.nombre,
      itemDestino: item.destino,
      productoDestino: item.producto?.destino,
      categoria: item.producto?.categoria?.nombre
    });

    // CAPA 1: Destino del ITEM
    if (item.destino) {
      const destinoItem = String(item.destino).toUpperCase();
      
      if (destinoItem === 'BARRA') {
        console.log(`✅ ACEPTADO en barra: "${item.producto?.nombre}" → item.destino = BARRA`);
        return true;
      }
      
      if (destinoItem === 'COCINA') {
        console.log(`❌ BLOQUEADO en barra: "${item.producto?.nombre}" → item.destino = COCINA`);
        return false;
      }
    }

    // CAPA 2: Destino del PRODUCTO
    if (item.producto?.destino) {
      const destinoProducto = String(item.producto.destino).toUpperCase();
      
      if (destinoProducto === 'BARRA') {
        console.log(`✅ ACEPTADO en barra: "${item.producto?.nombre}" → producto.destino = BARRA`);
        return true;
      }
      
      if (destinoProducto === 'COCINA') {
        console.log(`❌ BLOQUEADO en barra: "${item.producto?.nombre}" → producto.destino = COCINA`);
        return false;
      }
    }

    // CAPA 3: Filtro por NOMBRE (para items sin destino)
    const nombre = (item.producto?.nombre || '').toLowerCase();
    
    const palabrasBebidas = [
      'cerveza', 'corona', 'modelo', 'tecate', 'coca', 'pepsi',
      'refresco', 'limonada', 'naranjada', 'agua', 'te ', 'té ',
      'cafe', 'café', 'coctel', 'margarita', 'michelada', 'vino'
    ];

    if (palabrasBebidas.some(p => nombre.includes(p))) {
      console.log(`✅ ACEPTADO en barra: "${item.producto?.nombre}" → nombre contiene palabra de bebida`);
      return true;
    }

    // CAPA 4: Filtro por CATEGORÍA
    const categoria = (item.producto?.categoria?.nombre || '').toLowerCase();
    
    const categoriasBebidas = [
      'bebida', 'cerveza', 'bar', 'coctel', 'licor', 'cafe', 'café'
    ];

    if (categoriasBebidas.some(c => categoria.includes(c))) {
      console.log(`✅ ACEPTADO en barra: "${item.producto?.nombre}" → categoría "${categoria}" es de bebidas`);
      return true;
    }

    // Si no pasó ningún filtro -> NO es bebida
    console.log(`❌ BLOQUEADO en barra: "${item.producto?.nombre}" → no es bebida`);
    return false;
  }

  procesarListasVisuales() {
    console.log('🔄 ===== PROCESANDO LISTAS BARRA =====');
    console.log(`📦 Total órdenes recibidas: ${this.todasLasOrdenes.length}`);
    
    this.itemsPendientes = [];
    let itemsAceptados = 0;
    let itemsBloqueados = 0;

    this.todasLasOrdenes.forEach(pedido => {
      const fechaOrigen = (pedido as any).creadaEn || (pedido as any).createdAt || new Date();
      const horaInicio = new Date(fechaOrigen);
      
      console.log(`📋 Orden #${pedido.id} - Mesa: ${pedido.mesa?.numero || 'S/N'} - Items: ${pedido.items.length}`);
      
      pedido.items.forEach((item: any) => {
        // ✅ APLICAR FILTRO
        if (!this.esItemDeBarra(item)) {
          itemsBloqueados++;
          return; // No es bebida
        }

        // Solo mostrar items pendientes o en preparación
        if (item.estado !== 'PENDIENTE' && item.estado !== 'EN_PREPARACION') {
          return;
        }

        itemsAceptados++;

        const esElaborada = 
          item.producto?.categoria?.nombre === 'Cocteleria' || 
          (item.notas && item.notas.length > 0);

        this.itemsPendientes.push({
          pedidoId: pedido.id,
          itemId: item.id,
          productoNombre: item.producto.nombre,
          cantidad: item.cantidad,
          mesaNumero: pedido.mesa?.numero || 'S/N',
          tiempo: this.getMinutosTranscurridos(horaInicio),
          notas: item.notas,
          opciones: item.opcionesElegidas,
          esElaborada: !!esElaborada,
          horaInicio: horaInicio
        });
      });
    });

    this.conteoPendientes = this.itemsPendientes.length;

    // ✅ CALCULAR LISTOS (órdenes con TODAS las bebidas listas)
    this.conteoListas = this.calcularOrdenesListas();

    console.log('📊 ===== RESUMEN BARRA =====');
    console.log(`✅ Items aceptados: ${itemsAceptados}`);
    console.log(`❌ Items bloqueados: ${itemsBloqueados}`);
    console.log(`📋 Pendientes: ${this.conteoPendientes}`);
    console.log(`🍹 Listos: ${this.conteoListas}`);
    console.log('=====================================\n');
  }

  calcularOrdenesListas(): number {
    let ordenesListas = 0;

    this.todasLasOrdenes.forEach(pedido => {
      const bebidasDeLaOrden = pedido.items.filter((item: any) => this.esItemDeBarra(item));
      
      if (bebidasDeLaOrden.length === 0) return; // No tiene bebidas

      const todasListas = bebidasDeLaOrden.every((item: any) => item.estado === 'LISTA');
      
      if (todasListas) {
        ordenesListas++;
      }
    });

    return ordenesListas;
  }

  marcarItemComoListo(itemVisual: ItemVisual) {
    console.log(`🍹 Marcando item como listo: ${itemVisual.productoNombre}`);
    
    // 1. Actualizar estado del item en backend
    this.http.patch(`${this.apiUrl}/items/${itemVisual.itemId}`, { estado: 'LISTA' }).subscribe({
      next: () => {
        console.log(`✅ Item ${itemVisual.itemId} marcado como LISTA`);
        
        // 2. Quitar de la lista visual
        this.itemsPendientes = this.itemsPendientes.filter(i => i.itemId !== itemVisual.itemId);
        this.conteoPendientes = this.itemsPendientes.length;
        
        // 3. Recargar para actualizar el contador de listos
        this.cargarPedidos();
      },
      error: (err) => {
        console.error('❌ Error al marcar item como listo:', err);
        this.cargarPedidos(); // Recargar en caso de error
      }
    });
  }

  getMinutosTranscurridos(fecha: Date): number {
    const diff = new Date().getTime() - new Date(fecha).getTime();
    return Math.floor(diff / 60000);
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