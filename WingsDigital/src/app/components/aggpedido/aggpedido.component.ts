import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// Servicios
import { MesaService } from '../../services/mesa.service';
import { ProductosService, Producto, Categoria } from '../../services/productos.service';
import { PedidosService, CreatePedidoDto } from '../../services/pedidos.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

// Componentes
import { DetalleItemModalComponent } from '../detalle-item-modal/detalle-item-modal.component';
import { EnviarCocinaModalComponent } from '../enviar-cocina-modal/enviar-cocina-modal.component';
import { AdicionalesModalComponent } from '../adicionales-modal/adicionales-modal.component';

@Component({
  selector: 'app-aggpedido',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    DetalleItemModalComponent, 
    EnviarCocinaModalComponent, 
    AdicionalesModalComponent
  ],
  templateUrl: './aggpedido.component.html',
  styleUrls: ['./aggpedido.component.css']
})
export class AggpedidoComponent implements OnInit, OnDestroy {

  // Modales
  public mostrarModal = false;
  public mostrarModalCocina = false;
  public mostrarModalAdicionales = false;
  public mostrarModalCuenta = false;
  public mostrarModalLiberar = false; 

  public itemSeleccionadoParaModal: any | null = null;
  public pedidoParaModal: any = { items: [], total: 0 };
  
  // Configuración
  public esEscritorio = false;
  public mesaId: number | null = null;
  public ordenId: number | null = null;
  public nombreClienteTemporal: string = ''; 

  // Usuario
  public nombreMesero: string = '';
  public empleadoId: number | null = null;
  
  // Vistas
  public vistaActual: 'categorias' | 'items' = 'categorias';
  public vistaMovilActual: 'resumen' | 'categorias' | 'items' = 'resumen';
  public categoriaSeleccionada: string | null = null;
  
  // Datos del menú
  public categorias: Categoria[] = [];
  public productos: Producto[] = [];
  public productosOriginales: Producto[] = [];
  public itemsFiltrados: Producto[] = [];
  
  // ✅ Búsqueda
  public busqueda: string = '';
  
  // CARRITO (Local)
  public pedido: any[] = [];
  
  // ITEMS EN COCINA (Backend)
  public ordenActiva: any = null; 
  public itemsEnCocina: any[] = []; 
  public hayConsumo = false; 

  public totalItems = 0;
  public totalPrecio = 0.00;

  // Notificaciones
  public pedidosListos: any[] = [];
  public contadorNotificaciones = 0;
  public mostrarListaNotificaciones = false;
  private notificacionesInterval: any; 
  private audio: HTMLAudioElement | null = null;
  private socketSub: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private mesaService: MesaService,
    private productosService: ProductosService,
    private pedidosService: PedidosService,
    private authService: AuthService,
    private socketService: SocketService
  ) {
    this.audio = new Audio('assets/sounds/notification.mp3');
  }

  ngOnInit(): void {
    this.breakpointObserver.observe(['(min-width: 769px)'])
      .pipe(map(result => result.matches))
      .subscribe(resultado => {
        this.esEscritorio = resultado;
      });

    const user = this.authService.currentUser;
    if (!user && this.authService.token) {
        this.authService.logout();
        return;
    }

    if (user) {
        this.empleadoId = user.id;
        this.nombreMesero = user.nombre;
    } else {
        this.router.navigate(['/login']);
        return;
    }

    const url = this.router.url;
    if (url.includes('/pedido/orden/')) {
        const idOrden = this.route.snapshot.paramMap.get('idOrden');
        if (idOrden) {
            this.ordenId = Number(idOrden);
            this.mesaId = null;
            this.cargarOrdenPorId();
        }
    } else {
        this.route.queryParams.subscribe(params => {
            if(params['mesaId']) this.mesaId = Number(params['mesaId']);
            if(params['ordenId']) this.ordenId = Number(params['ordenId']);
            
            if(params['nombreCliente']) {
                this.nombreClienteTemporal = params['nombreCliente'];
                console.log('📝 Nombre temporal capturado:', this.nombreClienteTemporal);
            }
            
            if (this.mesaId) {
               this.recargarDatosMesa();
            } else if (this.ordenId) {
                this.cargarOrdenPorId();
            }
        });
        
        const idMesaParam = this.route.snapshot.paramMap.get('id');
        if (idMesaParam && !this.mesaId) {
            this.mesaId = Number(idMesaParam);
            this.recargarDatosMesa();
        }
    }

    this.cargarMenu();
    this.conectarSocket();

    this.verificarNotificaciones(); 
    this.notificacionesInterval = setInterval(() => {
        this.verificarNotificaciones();
    }, 10000); 
  }

  ngOnDestroy(): void {
    if (this.notificacionesInterval) clearInterval(this.notificacionesInterval);
    if (this.socketSub) this.socketSub.unsubscribe();
  }

  // =========================================================
  // CARGA DE DATOS
  // =========================================================

  recargarDatosMesa() {
    if (!this.mesaId) return;

    // ✅ CORREGIDO: Pasar true para NO sobrescribir horaApertura
    this.mesaService.actualizarEstadoMesa(
      this.mesaId!, 
      'ocupada', 
      this.nombreMesero,
      true // ✅ Mantener horaApertura existente (es una reentrada, no apertura nueva)
    ).subscribe();

    this.pedidosService.getPedidosPorMesa(this.mesaId!).subscribe({
        next: (ordenes: any[]) => {
            const ordenesActivas = ordenes.filter((o: any) => 
                o.estado !== 'CANCELADA' && 
                o.estado !== 'PAGADA' && 
                o.estado !== 'CERRADA'
            );

            if (ordenesActivas.length > 0) {
                const ultimaOrden = ordenesActivas[ordenesActivas.length - 1];
                this.ordenActiva = ultimaOrden;
                this.ordenId = ultimaOrden.id;

                let acumuladoItems: any[] = [];
                ordenesActivas.forEach((orden: any) => {
                    if (orden.items && Array.isArray(orden.items)) {
                        acumuladoItems = [...acumuladoItems, ...orden.items];
                    }
                });

                this.hayConsumo = acumuladoItems.length > 0;

                if (this.ordenActiva.estado === 'POR_COBRAR') {
                    this.itemsEnCocina = [];
                } else {
                    this.itemsEnCocina = acumuladoItems.filter((i: any) => i.estado !== 'ENTREGADA');
                }

            } else {
                this.itemsEnCocina = [];
                this.hayConsumo = false;
                this.ordenId = null;
                this.ordenActiva = null;
            }
        },
        error: (err: any) => console.error('Error cargando pedidos de mesa:', err)
    });
  }

  cargarOrdenPorId() {
      if(!this.ordenId) return;
      
      this.pedidosService.getOrden(this.ordenId).subscribe({
        next: (orden) => {
          this.ordenActiva = orden;
          this.ordenId = orden.id; 
          this.mesaId = orden.mesaId || null; 

          const items = orden.items || [];
          this.hayConsumo = items.length > 0;
          
          if (orden.estado === 'POR_COBRAR' || orden.estado === 'PAGADA' || orden.estado === 'CERRADA') {
              this.itemsEnCocina = [];
          } else {
              this.itemsEnCocina = items.filter((i: any) => i.estado !== 'ENTREGADA');
          }
        },
        error: (err) => console.error('Error cargando orden por ID:', err)
      });
  }

  cargarMenu() {
    // Primero cargar productos
    this.productosService.getProductos().subscribe({
      next: (productos: any) => {
        this.productos = productos;
        this.productosOriginales = productos;
        
        // Luego cargar categorías y calcular elementos
        this.productosService.getCategorias().subscribe({
          next: (data: any[]) => {
            this.categorias = data.map(cat => {
              // Contar productos de esta categoría desde el array de productos cargado
              const productosDeCategoria = this.productos.filter(p => p.categoriaId === cat.id && p.activo);
              
              return {
                ...cat,
                elementos: productosDeCategoria.length,
                iconoColor: cat.iconoColor || '#3498db'
              };
            });
            
            console.log('🍽️ Categorías cargadas:', this.categorias.map(c => `${c.nombre}: ${c.elementos} elementos`));
          },
          error: (error: any) => console.error('❌ Error categorías:', error)
        });
      },
      error: (error: any) => console.error('❌ Error productos:', error)
    });
  }

  // ✅ BÚSQUEDA
  buscarProductos(termino: string): void {
    this.busqueda = termino.toLowerCase().trim();
    
    if (this.busqueda === '') {
      if (this.vistaActual === 'items' && this.categoriaSeleccionada) {
        const catId = this.categorias.find(c => c.nombre === this.categoriaSeleccionada)?.id;
        if (catId) {
          this.itemsFiltrados = this.productos.filter(p => p.categoriaId === catId);
        }
      }
      return;
    }

    const resultados = this.productosOriginales.filter(p => 
      p.nombre.toLowerCase().includes(this.busqueda) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(this.busqueda))
    );

    if (resultados.length > 0) {
      this.itemsFiltrados = resultados;
      this.vistaActual = 'items';
      this.vistaMovilActual = 'items';
      this.categoriaSeleccionada = `Resultados (${resultados.length})`;
    } else {
      alert('No se encontraron productos');
    }
  }

  // =========================================================
  // GESTIÓN DEL CARRITO
  // =========================================================

agregarAlPedido(item: Producto): void {
    // 🛡️ VALIDACIÓN DE SEGURIDAD: Si está desactivado, no hacer nada
    if (item.activo === false) {
      alert('🚫 Este producto está marcado como AGOTADO.');
      return;
    }

    this.itemSeleccionadoParaModal = { ...item, cantidad: 1, notas: '' };
    this.mostrarModal = true;
  }

  confirmarAgregarItem(itemConDetalles: any): void {
    const itemExistente = this.pedido.find(p => 
      p.id === itemConDetalles.id && 
      JSON.stringify(p.opcionesElegidas) === JSON.stringify(itemConDetalles.opcionesElegidas) &&
      p.notas === itemConDetalles.notas
    );

    if (itemExistente) {
      itemExistente.cantidad += itemConDetalles.cantidad;
    } else {
      this.pedido.push({
        ...itemConDetalles,
        precioBase: itemConDetalles.precio || itemConDetalles.precioBase 
      });
    }
    
    this.calcularTotales();
    this.cerrarModal();
    this.vistaMovilActual = 'resumen';
  }

  editarItemDelPedido(item: any): void {
    this.pedido = this.pedido.filter(i => i !== item);
    this.itemSeleccionadoParaModal = item;
    this.mostrarModal = true;
  }

  eliminarDelPedido(itemId: number): void {
    const idx = this.pedido.findIndex(p => p.id === itemId);
    if(idx >= 0) this.pedido.splice(idx, 1);
    this.calcularTotales();
  }

  calcularTotales(): void {
    this.totalItems = this.pedido.reduce((total, item) => total + item.cantidad, 0);
    this.totalPrecio = this.pedido.reduce((total, item) => {
      const precioUnitario = item.precio || item.precioBase || 0; 
      return total + (precioUnitario * item.cantidad);
    }, 0);
  }

  // =========================================================
  // ENVÍO A COCINA
  // =========================================================

  abrirModalCocina(): void {
    if (this.pedido.length === 0) return;
    
    this.pedidoParaModal = {
      items: this.pedido.map(item => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio: (item.precio || item.precioBase) * item.cantidad
      })),
      total: this.totalPrecio
    };
    this.mostrarModalCocina = true;
  }

  procesarConfirmacionCocina(): void {
    if (!this.empleadoId) return;

    const itemsDto = this.pedido.map(item => {
      const productoCompleto = this.productos.find(p => p.id === item.id);
      
      let destinoFinal: string;

      if (productoCompleto?.destino) {
        destinoFinal = productoCompleto.destino;
      } 
      else {
        const categoria = this.categorias.find(c => c.id === item.categoriaId);
        const nombreCategoria = (categoria?.nombre || '').toLowerCase();
        
        const esBebida = 
          nombreCategoria.includes('bebida') ||
          nombreCategoria.includes('bar') ||
          nombreCategoria.includes('cerveza') ||
          nombreCategoria.includes('refresco') ||
          nombreCategoria.includes('coctel') ||
          nombreCategoria.includes('licor') ||
          nombreCategoria.includes('barra') ||
          nombreCategoria.includes('vino') ||
          nombreCategoria.includes('café') ||
          nombreCategoria.includes('cafe');

        destinoFinal = esBebida ? 'BARRA' : 'COCINA';
      }

      return {
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_item: item.precio || item.precioBase,
        notas: item.notas || null,
        opcionesElegidas: item.opcionesElegidas || null,
        destino: destinoFinal 
      };
    });

    const pedidoDto: any = {
      mesa_id: this.mesaId,
      empleado_id: this.empleadoId,
      mesero_id: this.empleadoId,
      items: itemsDto,
    };

    if (this.ordenId) {
      pedidoDto.orden_id = this.ordenId; 
    } else {
      pedidoDto.notaGeneral = this.nombreClienteTemporal || 'Cliente Nuevo'; 
    }

    this.pedidosService.crearPedido(pedidoDto).subscribe({
      next: (ordenCreada: any) => {
        const itemsBarra = itemsDto.filter(i => i.destino === 'BARRA').length;
        const itemsCocina = itemsDto.filter(i => i.destino === 'COCINA').length;
        
        let mensaje = '✅ Pedido enviado correctamente';
        if (itemsBarra > 0 && itemsCocina > 0) {
          mensaje += `\n🍹 ${itemsBarra} item(s) → Barra\n🍔 ${itemsCocina} item(s) → Cocina`;
        } else if (itemsBarra > 0) {
          mensaje += `\n🍹 ${itemsBarra} item(s) → Barra`;
        } else {
          mensaje += `\n🍔 ${itemsCocina} item(s) → Cocina`;
        }
        
        alert(mensaje);
        
        this.ordenId = ordenCreada.id;
        this.ordenActiva = ordenCreada;
        this.nombreClienteTemporal = '';

        if (this.mesaId) {
          this.recargarDatosMesa();
        } else {
          this.itemsEnCocina = ordenCreada.items || [];
          this.hayConsumo = true; 
        }

        this.pedido = []; 
        this.calcularTotales();
        this.mostrarModalCocina = false;
        
        if (!this.esEscritorio) {
          this.vistaMovilActual = 'resumen';
        }
      },
      error: (error: any) => {
        console.error('❌ Error al guardar:', error);
        alert('Error al enviar el pedido. Intenta de nuevo.');
      }
    });
  }

  // =========================================================
  // CUENTA Y LIBERACIÓN
  // =========================================================

  // ✅ MODIFICADO: Solo permitir si hay items en cocina
  abrirModalCuenta() {
    // Verificar que haya items en cocina (enviados, no solo en carrito local)
    if (this.itemsEnCocina.length === 0 && this.ordenActiva?.estado !== 'POR_COBRAR') {
        alert("⚠️ Debes enviar platillos a cocina antes de pedir la cuenta.");
        return;
    }
    
    this.mostrarModalCuenta = true;
  }

  // ✅ MODIFICADO: NO limpiar items en cocina al pedir cuenta
  confirmarPedirCuenta() {
    const idParaCuenta = this.ordenId; 
    if (!idParaCuenta) return;

    console.log(`💰 Solicitando cuenta para orden ${idParaCuenta}...`);

    this.pedidosService.solicitarCuenta(idParaCuenta).subscribe({
      next: () => {
        this.mostrarModalCuenta = false;
        alert('✅ Cuenta solicitada a caja.');
        
        // ✅ NO limpiar itemsEnCocina - deben permanecer visibles en cocina/barra
        // Solo los items terminados (LISTA) se ocultarán cuando el mesero confirme entrega
        // this.itemsEnCocina = []; // ❌ ELIMINAR ESTA LÍNEA
        
        if (this.ordenActiva) this.ordenActiva.estado = 'POR_COBRAR';

        this.regresar();
      },
      error: (err: any) => {
        console.error('❌ Error al solicitar la cuenta:', err);
        const mensaje = err.error?.message || err.message || 'Error de conexión con el servidor';
        alert(`Error: ${mensaje}`);
      }
    });
  }

  // ✅ NUEVO: Eliminar pedido para llevar vacío
  eliminarPedidoVacio() {
    if (!this.ordenId) {
      // Si no hay orden creada, solo regresar
      this.regresar();
      return;
    }

    const confirmar = confirm('¿Eliminar este pedido vacío?');
    if (!confirmar) return;

    this.pedidosService.cancelarOrden(this.ordenId).subscribe({
      next: () => {
        console.log(`✅ Pedido para llevar ${this.ordenId} eliminado`);
        this.regresar();
      },
      error: (err) => {
        console.error('❌ Error al eliminar pedido:', err);
        alert('Error al eliminar el pedido');
      }
    });
  }

  liberarMesa() {
    this.mostrarModalLiberar = true;
  }

  cerrarModalLiberar() {
    this.mostrarModalLiberar = false;
  }

  confirmarLiberacion() {
    this.mostrarModalLiberar = false;
    
    if (this.ordenId) {
        this.pedidosService.cancelarOrden(this.ordenId).subscribe({
            next: () => this.finalizarLiberacion(),
            error: () => this.finalizarLiberacion()
        });
    } else {
        this.finalizarLiberacion();
    }
  }

  // ✅ MODIFICADO: Limpieza mejorada con logs
  finalizarLiberacion() {
    if (this.mesaId) {
      console.log(`🧹 Liberando mesa ${this.mesaId} y limpiando datos...`);
      
      this.mesaService.actualizarEstadoMesa(
        this.mesaId, 
        'disponible', 
        '' // ✅ String vacío = limpiar mesero, meseroId y horaApertura
      ).subscribe({
        next: () => {
          console.log(`✅ Mesa ${this.mesaId} liberada correctamente`);
          this.regresar();
        },
        error: (err) => {
          console.error('❌ Error al liberar mesa:', err);
          this.regresar(); // Regresar aunque falle
        }
      });
    } else {
      this.regresar();
    }
  }

  // =========================================================
  // NOTIFICACIONES
  // =========================================================

  conectarSocket() {
    this.socketSub = this.socketService.escucharPedidosParaCobrar().subscribe((data: any) => {
        if (data && this.mesaId && data.mesaId === this.mesaId) {
            this.recargarDatosMesa(); 
        }
    });
  }

  verificarNotificaciones() {
    this.pedidosService.obtenerPendientes().subscribe({
      next: (ordenes: any[]) => {
        const misOrdenesListas = ordenes.filter(o => {
            const esLista = o.estado === 'LISTA';
            if (!esLista) return false;

            const soyYo = String(o.meseroId || o.mesero?.id) === String(this.empleadoId);
            return soyYo;
        });

        this.pedidosListos = misOrdenesListas.map(o => {
            const totalCalculado = (o.items || []).reduce((acc: number, item: any) => {
                const precio = Number(item.precioUnitario) || Number(item.precio) || 0;
                return acc + (precio * item.cantidad);
            }, 0);

            return {
                id: o.id,
                mesaId: o.mesa?.numero || 'Llevar',
                total: totalCalculado, 
                items: o.items
            };
        });

        const cuentaAnterior = this.contadorNotificaciones;
        this.contadorNotificaciones = this.pedidosListos.length;

        if (this.contadorNotificaciones > cuentaAnterior) {
            this.audio?.play().catch(()=>{});
        }
      }
    });
  }

  // ✅ CORREGIDO: Solo quita notificación visual, NO actualiza a ENTREGADA
  confirmarEntrega(pedido: any) {
    console.log(`🔔 Quitando notificación de orden ${pedido.id}...`);
    
    // ❌ NO actualizar estado de la orden a ENTREGADA
    // La orden debe permanecer en LISTA hasta que se pague en caja
    
    // Solo actualizar items individuales a ENTREGADA para limpiar pantallas de cocina
    if (pedido.items && pedido.items.length > 0) {
      pedido.items.forEach((item: any) => {
        if (item.estado === 'LISTA') {
          this.pedidosService.actualizarEstadoItem(item.id, 'ENTREGADA').subscribe({
            next: () => console.log(`✅ Item ${item.id} marcado como ENTREGADO (limpia cocina)`),
            error: (err) => console.error(`❌ Error al actualizar item ${item.id}:`, err)
          });
        }
      });
    }
    
    // Limpiar interfaz local (quitar notificación)
    this.pedidosListos = this.pedidosListos.filter(p => p.id !== pedido.id);
    this.contadorNotificaciones = this.pedidosListos.length;
    
    // Recargar datos si estamos en la misma mesa
    if (this.mesaId && String(this.mesaId) === String(pedido.mesaId)) {
      this.recargarDatosMesa();
    }
    
    console.log('✅ Notificación removida. Orden permanece en estado LISTA hasta que se pague.');
  }

  // ✅ MODIFICADO: Procesa todas las entregas con logs
  limpiarNotificaciones() { 
    console.log(`🧹 Limpiando ${this.pedidosListos.length} notificaciones...`);
    
    const copia = [...this.pedidosListos];
    copia.forEach(p => this.confirmarEntrega(p));
    
    this.mostrarListaNotificaciones = false; 
  }

  // =========================================================
  // NAVEGACIÓN Y UI
  // =========================================================

  toggleListaNotificaciones() { this.mostrarListaNotificaciones = !this.mostrarListaNotificaciones; }
  
  // ✅ CORREGIDO: Solo navega, NO confirma entrega automáticamente
  irAMesa(pedido: any) {
    this.mostrarListaNotificaciones = false;
    
    // ❌ NO confirmar entrega automáticamente
    // El mesero debe confirmar manualmente con el botón de check
    
    // Navegar a la mesa o pedido para llevar
    if (pedido.mesaId && pedido.mesaId !== 'Llevar') {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(['/pedido', pedido.mesaId]);
      });
    } else {
      // Pedido para llevar
      this.router.navigate(['/pedido/orden', pedido.id]);
    }
  }

  filtrarPorCategoria(categoriaId: number): void {
    this.itemsFiltrados = this.productos.filter(p => p.categoriaId === categoriaId);
    const catEncontrada = this.categorias.find(c => c.id === categoriaId);
    this.categoriaSeleccionada = catEncontrada ? catEncontrada.nombre : 'Menú';
    this.vistaActual = 'items';
    this.vistaMovilActual = 'items';
    this.busqueda = '';
  }

  volverACategorias() { 
    this.vistaActual = 'categorias'; 
    this.vistaMovilActual = 'categorias';
    this.busqueda = '';
  }
  
  volverResumenMovil() { this.vistaMovilActual = 'resumen'; }
  agregarItem() { this.vistaMovilActual = 'categorias'; }
  
  regresar() { this.router.navigate(['/mesas']); }
  Logout() { this.authService.logout(); }

  // Modales
  cerrarModal() { this.mostrarModal = false; this.itemSeleccionadoParaModal = null; }
  cancelarEnvioCocina() { this.mostrarModalCocina = false; }
  
  abrirModalAdicionales() { this.mostrarModalAdicionales = true; }
  cerrarModalAdicionales() { this.mostrarModalAdicionales = false; }
  
  confirmarAdicionales(adicionales: any[]) {
    adicionales.forEach(adicional => {
      this.pedido.push({ ...adicional, esAdicional: true });
    });
    this.calcularTotales();
    this.cerrarModalAdicionales();
  }
  
  cerrarModalCuenta() { this.mostrarModalCuenta = false; }
}