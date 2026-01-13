import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { Subscription, interval } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { MesaService, Mesa } from '../../services/mesa.service';
import { SocketService, ComandaCompleta } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { PedidosService, CreatePedidoDto } from '../../services/pedidos.service';

interface MesaVisual extends Mesa {
  tipo: string; 
  capacidad: number; 
  comensales?: number; 
  mesero?: string; 
  meseroId?: number;
  horaInicio?: string;
  tiempoTranscurrido?: string; 
  tienePedidoListo?: boolean; 
  mesaPadreId?: number | null;
}

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mesas.component.html',
  styleUrls: ['./mesas.component.css']
})
export class MesasComponent implements OnInit, OnDestroy {
  
  public esEscritorio = false;
  public mesas: MesaVisual[] = [];
  public nombreMesero = ''; 
  public usuarioActualId: number = 0; 
  public rolUsuario: string = ''; // Para validar permisos especiales (Gerente)
  public sucursalId: number | null = null; // Sucursal del usuario

  public ordenesParaLlevarActivas: any[] = [];
  public filtroActual: 'TODAS' | 'DISPONIBLES' | 'OCUPADAS' | 'SUCIAS' = 'TODAS';
  public textoBusqueda: string = ''; 

  public totalMesas = 0;
  public totalDisponibles = 0;
  public totalOcupadas = 0;
  public totalReservadas = 0;
  public totalMisMesas = 0;
  public totalSucias = 0; 

  public pedidosListos: any[] = [];
  public contadorNotificaciones = 0;
  public mostrarListaNotificaciones = false;

  public mostrarModalCliente = false; 
  public mostrarModalComensales = false; 
  public nombreClienteTemp = '';
  public comensalesTemp: number = 2;
  public mesaSeleccionadaTemp: MesaVisual | null = null;

  // --- MODO UNIÓN ---
  public modoUnion = false;
  public mesaPrincipalUnion: MesaVisual | null = null;

  // --- MODO TRANSFERENCIA ---
  public modoTransferencia = false;
  public mesaOrigenTransferencia: MesaVisual | null = null;

  public modalAlerta = { visible: false, mensaje: '', tipo: 'info' }; 
  public modalConfirmacion = { visible: false, mensaje: '', accion: () => {} };
  
  private subscriptions = new Subscription();
  private audio: HTMLAudioElement | null = null;

  constructor(
    private router: Router, 
    private breakpointObserver: BreakpointObserver, 
    private mesaService: MesaService,
    private socketService: SocketService,
    private authService: AuthService,
    private pedidosService: PedidosService 
  ) {
    this.audio = new Audio('assets/sounds/notification.mp3');
    const user = this.authService.currentUser; 
    this.usuarioActualId = user ? user.id : 0;
    this.rolUsuario = user ? (user.rol || '') : '';
    this.sucursalId = this.authService.getSucursalId();
    
    console.log('🏢 Usuario de sucursal:', this.sucursalId);
  }

  ngOnInit(): void {
    if (this.usuarioActualId === 0) {
      this.router.navigate(['/login']);
      return;
    }
    this.nombreMesero = this.authService.getNombreUsuario() || 'Mesero';
    this.breakpointObserver.observe([Breakpoints.WebLandscape, Breakpoints.WebPortrait])
      .pipe(map(result => result.matches))
      .subscribe(resultado => { this.esEscritorio = resultado; });

    this.cargarMesas();
    this.cargarOrdenesParaLlevar();
    this.escucharSockets();
    
    // Intervalos de actualización
    this.subscriptions.add(interval(60000).subscribe(() => { 
      this.cargarMesas(); 
      this.cargarOrdenesParaLlevar(); 
    }));
    
    // Intervalo de notificaciones (5s)
    this.subscriptions.add(interval(5000).subscribe(() => { 
      this.verificarNotificacionesComida(); 
      this.cargarOrdenesParaLlevar(); 
    }));
  }

  // ==========================================
  // PERSISTENCIA Y LIMPIEZA
  // ==========================================
  guardarUnionLocal(hijaId: number, padreId: number) {
    const uniones = JSON.parse(localStorage.getItem('uniones_mesas') || '{}');
    uniones[hijaId] = padreId;
    localStorage.setItem('uniones_mesas', JSON.stringify(uniones));
  }

  obtenerUnionLocal(hijaId: number): number | null {
    const uniones = JSON.parse(localStorage.getItem('uniones_mesas') || '{}');
    return uniones[hijaId] || null;
  }

  limpiarUnionesObsoletas(listaMesasBackend: any[]) {
    const uniones = JSON.parse(localStorage.getItem('uniones_mesas') || '{}');
    let cambios = false;
    Object.keys(uniones).forEach(keyHijaId => {
      const hijaId = Number(keyHijaId);
      const padreId = uniones[hijaId];
      const mesaPadre = listaMesasBackend.find(m => m.id === padreId);
      const mesaHija = listaMesasBackend.find(m => m.id === hijaId);
      const estadoPadre = mesaPadre ? mesaPadre.estado.toLowerCase() : 'desconocido';

      if (!mesaPadre || estadoPadre === 'disponible' || estadoPadre === 'libre' || estadoPadre === 'sucia') {
        delete uniones[hijaId];
        cambios = true;
        if (mesaHija && mesaHija.estado.toLowerCase() === 'ocupada') {
          this.mesaService.actualizarEstadoMesa(hijaId, 'disponible', '').subscribe({
            next: () => setTimeout(() => this.cargarMesas(), 500)
          });
        }
      }
    });
    if (cambios) localStorage.setItem('uniones_mesas', JSON.stringify(uniones));
  }

  obtenerCapacidadTotal(mesa: MesaVisual): number {
    let capacidadTotal = mesa.capacidad;
    const mesasHijas = this.mesas.filter(m => m.mesaPadreId === mesa.id);
    mesasHijas.forEach(hija => {
      capacidadTotal += hija.capacidad;
    });
    return capacidadTotal;
  }

  // ==========================================
  // CARGA DE DATOS
  // ==========================================
  cargarMesas() {
    this.mesaService.getMesas().subscribe({
      next: (data) => {
        let listaMesas = data as any[];
        
        // 🏢 FILTRAR POR SUCURSAL DEL USUARIO
        if (this.sucursalId) {
          listaMesas = listaMesas.filter(m => Number(m.sucursalId) === Number(this.sucursalId));
          console.log(`🏢 Mesas filtradas para sucursal ${this.sucursalId}:`, listaMesas.length);
        }
        
        this.limpiarUnionesObsoletas(listaMesas);

        this.mesas = listaMesas.map(m => {
          let padreId = m.mesaPadreId || this.obtenerUnionLocal(m.id);
          let estadoVisual = m.estado ? m.estado.toLowerCase() : 'disponible';

          if (padreId) {
            const parentTable = listaMesas.find(p => p.id === padreId);
            if (!parentTable || parentTable.estado.toLowerCase() === 'disponible' || parentTable.estado.toLowerCase() === 'sucia') {
              padreId = null;
              estadoVisual = m.estado ? m.estado.toLowerCase() : 'disponible'; 
            } else {
              estadoVisual = 'ocupada'; 
            }
          }

          let tiempoCalculado = '';
          if (estadoVisual === 'ocupada' && m.horaApertura) {
            tiempoCalculado = this.calcularTiempo(m.horaApertura);
          }

          return {
            ...m,
            id: m.id,
            numero: m.numero,
            capacidad: m.capacidad || 4,
            estado: estadoVisual,
            tipo: m.tipo || (m.capacidad > 2 ? 'cuadrada' : 'rectangular'),
            mesero: m.mesero,
            meseroId: m.meseroId,
            comensales: m.comensales || 0,
            horaInicio: m.horaApertura,
            horaApertura: m.horaApertura,
            tiempoTranscurrido: tiempoCalculado,
            tienePedidoListo: false,
            mesaPadreId: padreId
          };
        });
        
        this.actualizarContadores();
        this.verificarNotificacionesComida();
      },
      error: (err: any) => {
        if (err.status === 401) this.authService.logout();
      }
    });
  }

  obtenerNumeroMesa(id: number): string {
    const padre = this.mesas.find(m => m.id === id);
    return padre ? padre.numero : '?';
  }

  // ✅ CORREGIDO: Ahora excluye también 'ENTREGADA'
cargarOrdenesParaLlevar() { 
  this.pedidosService.obtenerPendientes().subscribe({ 
    next: (ordenes: any[]) => {
      console.log('📦 Total órdenes del backend:', ordenes.length);
      console.log('📦 Órdenes para llevar (sin mesa):', ordenes.filter(o => !o.mesaId).length);
      
      const paraLlevar = ordenes.filter(o => !o.mesaId);
      console.log('📦 Estados de órdenes para llevar:', paraLlevar.map(o => ({
        id: o.id,
        estado: o.estado,
        mesero: o.mesero,
        items: o.items?.length || 0
      })));
      
      this.ordenesParaLlevarActivas = ordenes.filter(o => 
        !o.mesaId && 
        o.estado !== 'CANCELADA' && 
        o.estado !== 'PAGADA' && 
        o.estado !== 'CERRADA'
        // ✅ NO excluimos ENTREGADA porque aún no están pagados
      );
      
      console.log('✅ Órdenes para llevar activas después del filtro:', this.ordenesParaLlevarActivas.length);
    } 
  }); 
}
  
  // VERIFICACIÓN DE NOTIFICACIONES
  verificarNotificacionesComida() { 
    this.pedidosService.obtenerPendientes().subscribe({ 
      next: (ordenes: any[]) => { 
        
        // 1. Marcar mesas visualmente (Ícono rojo)
        this.mesas.forEach(mesa => { 
          const ordenMesa = ordenes.find(o => o.mesaId === mesa.id); 
          if (ordenMesa && ordenMesa.estado === 'LISTA') { 
            mesa.tienePedidoListo = true; 
          } else { 
            mesa.tienePedidoListo = false; 
          } 
        }); 

        // 2. Llenar la lista de notificaciones (Campanita)
        const misOrdenesListas = ordenes.filter(o => {
          const esLista = o.estado === 'LISTA';
          if (!esLista) return false;
          const ownerId = o.meseroId || (o.mesero ? o.mesero.id : 0);
          return String(ownerId) === String(this.usuarioActualId);
        });

        this.pedidosListos = misOrdenesListas.map(o => {
          const totalCalculado = (o.items || []).reduce((acc: number, item: any) => {
            const precio = Number(item.precioUnitario) || Number(item.precio) || 0;
            return acc + (precio * item.cantidad);
          }, 0);

          return {
            id: o.id,
            mesaId: o.mesa?.numero || 'Llevar', 
            total: o.total || totalCalculado,
            items: o.items,
            estado: o.estado
          };
        });

        const cuentaAnterior = this.contadorNotificaciones;
        this.contadorNotificaciones = this.pedidosListos.length;

        if (this.contadorNotificaciones > cuentaAnterior) {
          this.audio?.play().catch(()=>{});
        }
      }, 
      error: (err) => console.error(err) 
    }); 
  }
  
  calcularTiempo(fecha?: string): string {
    if (!fecha) return '';
    
    const inicio = new Date(fecha).getTime();
    const ahora = new Date().getTime();
    const diffMs = ahora - inicio;
    
    if (diffMs < 0 || diffMs > 86400000) {
      console.warn('⚠️ Tiempo inválido detectado:', { fecha, diffMs });
      return '';
    }
    
    const diffMinutos = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMinutos / 60);
    const minutos = diffMinutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min`;
  }   
  
  esTiempoExcedido(fecha?: string): boolean { 
    if (!fecha) return false; 
    const inicio = new Date(fecha).getTime(); 
    const ahora = new Date().getTime(); 
    return (ahora - inicio) > (2 * 60 * 60 * 1000); 
  }
  
  actualizarContadores() { 
    this.totalMesas = this.mesas.length; 
    this.totalDisponibles = this.mesas.filter(m => m.estado === 'disponible').length; 
    this.totalOcupadas = this.mesas.filter(m => m.estado === 'ocupada').length; 
    this.totalSucias = this.mesas.filter(m => m.estado === 'sucia').length;
    this.totalReservadas = this.mesas.filter(m => m.estado === 'reservada').length; 
    this.totalMisMesas = this.mesas.filter(m => m.meseroId === this.usuarioActualId).length; 
  }
  
  get mesasFiltradas(): MesaVisual[] { 
    let lista = this.mesas; 
    if (this.filtroActual === 'DISPONIBLES') lista = lista.filter(m => m.estado === 'disponible'); 
    if (this.filtroActual === 'OCUPADAS') lista = lista.filter(m => m.estado === 'ocupada'); 
    if (this.filtroActual === 'SUCIAS') lista = lista.filter(m => m.estado === 'sucia'); 
    if (this.textoBusqueda.trim() !== '') { 
      const texto = this.textoBusqueda.toLowerCase(); 
      lista = lista.filter(m => 
        m.numero.toLowerCase().includes(texto) || 
        (m.mesero && m.mesero.toLowerCase().includes(texto)) 
      ); 
    } 
    return lista; 
  }
  
  setFiltro(filtro: 'TODAS' | 'DISPONIBLES' | 'OCUPADAS' | 'SUCIAS') { 
    this.filtroActual = filtro; 
  }

  // ==========================================
  // MÉTODOS PARA MODALES
  // ==========================================
  
  mostrarAlerta(mensaje: string, tipo: 'info'|'error' = 'info') {
    this.modalAlerta = { visible: true, mensaje, tipo };
  }
  
  cerrarAlerta() { 
    this.modalAlerta.visible = false; 
  }

  mostrarConfirmacion(mensaje: string, accion: () => void) {
    this.modalConfirmacion = { visible: true, mensaje, accion };
  }
  
  cerrarConfirmacion() { 
    this.modalConfirmacion.visible = false; 
  }
  
  ejecutarConfirmacion() { 
    if(this.modalConfirmacion.accion) this.modalConfirmacion.accion(); 
    this.cerrarConfirmacion(); 
  }

  // ==========================================
  // GESTIÓN DE MODOS (TOGGLES)
  // ==========================================
  
  toggleModoUnion() {
    this.modoUnion = !this.modoUnion;
    this.mesaPrincipalUnion = null;
    this.mesaSeleccionadaTemp = null;
    
    if (this.modoUnion) {
      this.modoTransferencia = false;
      this.mesaOrigenTransferencia = null;
    }
  }

  toggleModoTransferencia() {
    this.modoTransferencia = !this.modoTransferencia;
    this.mesaOrigenTransferencia = null;
    this.mesaSeleccionadaTemp = null;

    if (this.modoTransferencia) {
      this.modoUnion = false;
      this.mesaPrincipalUnion = null;
    }
  }

  // ==========================================
  // LÓGICA DE SELECCIÓN MAESTRA
  // ==========================================
  
  seleccionarMesa(mesa: MesaVisual): void {

    if (mesa.estado === 'mantenimiento') {
    this.mostrarAlerta('⛔ Esta mesa está inhabilitada por Gerencia.', 'error');
    return;
    }
    
    // --- 0. SI LA MESA ESTÁ SUCIA ---
    if (mesa.estado === 'sucia') {
      this.mostrarConfirmacion(`La Mesa ${mesa.numero} está sucia. ¿Ya se limpió y está lista?`, () => {
        this.mesaService.actualizarEstadoMesa(mesa.id, 'disponible', '').subscribe({
          next: () => {
            this.cargarMesas();
            this.mostrarAlerta(`Mesa ${mesa.numero} marcada como limpia.`);
          },
          error: (err) => this.mostrarAlerta("Error al actualizar estado.", 'error')
        });
      });
      return; 
    }

    // --- 1. MODO TRANSFERENCIA ---
    if (this.modoTransferencia) {
      if (!this.mesaOrigenTransferencia) {
        if (mesa.estado !== 'ocupada') {
          this.mostrarAlerta("Selecciona la mesa que quieres MOVER (debe estar ocupada).", 'error');
          return;
        }
        if (mesa.mesaPadreId) {
          this.mostrarAlerta("Esta mesa es secundaria. Selecciona la mesa principal.", 'error');
          return;
        }
        
        const esMia = mesa.meseroId === this.usuarioActualId;
        const esHuerfana = !mesa.meseroId || mesa.meseroId === 0;
        const soyGerente = this.rolUsuario === 'GERENTE' || this.rolUsuario === 'ADMIN_EMPRESA';

        if (!esMia && !soyGerente && !esHuerfana) {
          this.mostrarAlerta(`⛔ No puedes mover esta mesa. Pertenece a ${mesa.mesero}.`, 'error');
          return;
        }
        this.mesaOrigenTransferencia = mesa;
      } else {
        if (mesa.id === this.mesaOrigenTransferencia.id) {
          this.mesaOrigenTransferencia = null; 
          return;
        }
        this.procesarTransferencia(mesa);
      }
      return;
    }

    // --- 2. MODO UNIÓN ---
    if (this.modoUnion) {
      if (!this.mesaPrincipalUnion) {
        if (mesa.mesaPadreId) {
          this.mostrarAlerta("Esta mesa ya está unida a otra. Selecciona la mesa principal.", 'error');
          return;
        }
        
        const esMia = mesa.meseroId === this.usuarioActualId;
        const esHuerfana = !mesa.meseroId || mesa.meseroId === 0;
        const soyGerente = this.rolUsuario === 'GERENTE' || this.rolUsuario === 'ADMIN_EMPRESA';

        if (mesa.estado === 'ocupada' && !esMia && !soyGerente && !esHuerfana) {
          this.mostrarAlerta(`⛔ No puedes usar esta mesa como principal. Pertenece a ${mesa.mesero}.`, 'error');
          return;
        }
        this.mesaPrincipalUnion = mesa;
      } else {
        if (mesa.id === this.mesaPrincipalUnion.id) {
          this.mesaPrincipalUnion = null; 
          return;
        }
        this.procesarUnion(mesa);
      }
      return;
    }

    // --- 3. MODO NORMAL (ENTRAR A LA MESA) ---
    if (mesa.estado === 'ocupada') {
      
      const esMia = mesa.meseroId === this.usuarioActualId;
      const soyGerente = this.rolUsuario === 'GERENTE' || this.rolUsuario === 'ADMIN_EMPRESA';
      const esHuerfana = !mesa.meseroId || mesa.meseroId === 0; 

      if (!esMia && !soyGerente && !esHuerfana) {
        const nombreOwner = mesa.mesero ? mesa.mesero : 'otro mesero';
        this.mostrarAlerta(`⛔ ACCESO DENEGADO. Esta mesa está siendo atendida por ${nombreOwner}.`, 'error');
        return;
      }

      if (mesa.mesaPadreId) {
        this.router.navigate(['/pedido', mesa.mesaPadreId]); 
        return;
      }
      this.router.navigate(['/pedido', mesa.id]);
      return;
    }
    
    // Si está disponible, abrir modal para nueva orden
    if (mesa.estado === 'disponible') {
      this.mesaSeleccionadaTemp = mesa;
      this.comensalesTemp = 2; 
      this.mostrarModalComensales = true;
    }
  }

  // ==========================================
  // PROCESAMIENTO DE ACCIONES
  // ==========================================

  confirmarAperturaMesa() {
    if (!this.mesaSeleccionadaTemp) return;
    
    if (this.comensalesTemp < 1) { 
      this.mostrarAlerta("Mínimo 1 persona", 'error'); 
      return; 
    }

    const capacidadTotal = this.obtenerCapacidadTotal(this.mesaSeleccionadaTemp);

    if (this.comensalesTemp > capacidadTotal) {
      this.mostrarAlerta(`Capacidad excedida. Máximo ${capacidadTotal} personas (considerando uniones).`, 'error');
      return;
    }
    
    this.crearOrdenBackend(this.mesaSeleccionadaTemp.id, this.comensalesTemp);
  }

  procesarUnion(segundaMesa: MesaVisual) {
    if (!this.mesaPrincipalUnion) return;
    
    if (segundaMesa.estado !== 'disponible') { 
      this.mostrarAlerta("La mesa a unir debe estar disponible (vacía).", 'error'); 
      return; 
    }

    this.mostrarConfirmacion(`¿Unir la Mesa ${segundaMesa.numero} a la Mesa ${this.mesaPrincipalUnion.numero}?`, () => {
      this.guardarUnionLocal(segundaMesa.id, this.mesaPrincipalUnion!.id);
      segundaMesa.mesaPadreId = this.mesaPrincipalUnion!.id;
      segundaMesa.estado = 'ocupada';

      this.mesaService.actualizarEstadoMesa(segundaMesa.id, 'ocupada', this.nombreMesero).subscribe({
        next: () => {
          const padreEstabaDisponible = this.mesaPrincipalUnion?.estado === 'disponible';
          this.toggleModoUnion();

          if (padreEstabaDisponible) {
            setTimeout(() => {
              const padre = this.mesas.find(m => m.id === this.mesaPrincipalUnion!.id);
              if(padre) {
                this.mesaSeleccionadaTemp = padre;
                this.comensalesTemp = 2;
                this.mostrarModalComensales = true;
              }
            }, 100);
          } else {
            this.mostrarAlerta("Mesas unidas correctamente.");
            this.cargarMesas();
          }
        },
        error: () => this.mostrarAlerta("Error al unir las mesas.", 'error')
      });
    });
  }

  procesarTransferencia(mesaDestino: MesaVisual) {
    if (!this.mesaOrigenTransferencia) return;

    if (mesaDestino.estado !== 'disponible') {
      this.mostrarAlerta("La mesa de destino debe estar LIBRE.", 'error');
      return;
    }

    const comensalesActuales = (this.mesaOrigenTransferencia.comensales && this.mesaOrigenTransferencia.comensales > 0) 
                              ? this.mesaOrigenTransferencia.comensales 
                              : 1; 

    const capacidadDestino = this.obtenerCapacidadTotal(mesaDestino);

    if (capacidadDestino < comensalesActuales) {
      this.mostrarAlerta(
        `Capacidad insuficiente. Hay ${comensalesActuales} comensales y la Mesa ${mesaDestino.numero} solo soporta ${capacidadDestino}.`, 
        'error'
      );
      return; 
    }

    this.mostrarConfirmacion(`¿Mover cuenta de Mesa ${this.mesaOrigenTransferencia.numero} a Mesa ${mesaDestino.numero}?`, () => {
      this.mesaService.transferirMesa(this.mesaOrigenTransferencia!.id, mesaDestino.id).subscribe({
        next: () => {
          this.toggleModoTransferencia();
          this.mostrarAlerta("Mesa cambiada correctamente.");
          setTimeout(() => {
            this.cargarMesas();
          }, 300);
        },
        error: (err: any) => {
          console.error('Error en transferencia:', err);
          const msg = err.error?.message || err.message || "Error al cambiar de mesa. Verifica el servidor.";
          this.mostrarAlerta(msg, 'error');
        }
      });
    });
  }

  crearOrdenParaLlevar() { 
    this.nombreClienteTemp = '';
    this.mostrarModalCliente = true;
  }

  confirmarParaLlevar() {
    if (!this.nombreClienteTemp.trim()) { 
      this.mostrarAlerta("Nombre requerido", 'error'); 
      return; 
    }
    const nombre = this.nombreClienteTemp;
    this.cerrarModales();
    this.router.navigate(['/pedido/agregar'], { 
      queryParams: { nombreCliente: nombre } 
    }).catch(err => console.error('Error navegando:', err));
  }

  crearOrdenBackend(mesaId: number | null, comensales: number, nota: string = '') {
    if (!mesaId && (!nota || nota.trim() === '')) {
      nota = 'Cliente (Sin Nombre)';
    }
    
    const nuevaOrden: any = {
      mesa_id: mesaId, 
      empleado_id: this.usuarioActualId,
      mesero_id: this.usuarioActualId,
      items: [],
      comensales: comensales,
      notaGeneral: nota,
      nota_general: nota 
    };
    
    this.pedidosService.crearOrden(nuevaOrden).subscribe({
      next: (orden: any) => {
        this.cerrarModales();
        
        if (mesaId) {
          this.mesaService.actualizarEstadoMesa(
            mesaId, 
            'ocupada', 
            this.nombreMesero,
            false
          ).subscribe({
            next: () => {
              console.log(`✅ Mesa ${mesaId} abierta con nuevo timestamp`);
              this.router.navigate(['/pedido', mesaId]);
            },
            error: () => {
              this.router.navigate(['/pedido', mesaId]);
            }
          });
        } else {
          this.router.navigate(['/pedido/orden', orden.id]); 
        }
      },
      error: (err: any) => {
        if (err.status === 401) {
          this.authService.logout();
        } else {
          this.mostrarAlerta('Error al crear la orden.', 'error');
        }
      }
    });
  }

  cerrarModales() {
    this.mostrarModalCliente = false;
    this.mostrarModalComensales = false;
    this.mesaSeleccionadaTemp = null;
  }

  escucharSockets() {
    if (!this.socketService.isConnected()) this.socketService.reconnect();
    this.subscriptions.add(this.socketService.escucharPedidosParaCobrar().subscribe({
      next: (pedido: ComandaCompleta) => {
        if(pedido.estado === 'PAGADA' || pedido.estado === 'CANCELADA') {
          this.cargarMesas();
          this.cargarOrdenesParaLlevar(); // ✅ AGREGADO
        }
        if (pedido.mesero === this.nombreMesero) {
          this.verificarNotificacionesComida();
        }
      }
    }));
  }

  agregarNotificacion(pedido: ComandaCompleta) {
    if (!this.pedidosListos.find(p => p.id === pedido.id)) {
      const p: any = pedido; 
      p.mesaId = pedido.mesaId || 'Llevar';
      this.pedidosListos.unshift(p);
      this.contadorNotificaciones++;
      this.audio?.play().catch(()=>{});
    }
  }

  toggleListaNotificaciones() { 
    this.mostrarListaNotificaciones = !this.mostrarListaNotificaciones; 
  }
  
limpiarNotificaciones() { 
  // ✅ Simplemente limpiar la lista local, NO actualizar backend
  this.pedidosListos = []; 
  this.contadorNotificaciones = 0;
  this.mostrarListaNotificaciones = false;
  
  // ✅ Recargar por si hay nuevas notificaciones
  setTimeout(() => {
    this.verificarNotificacionesComida();
  }, 500);
}
irAMesa(pedido: any) { 
  // ✅ NO confirmar entrega, solo navegar
  // this.confirmarEntrega(pedido); // ❌ ELIMINAR ESTA LÍNEA
  
  if(pedido.mesaId && pedido.mesaId !== 'Llevar') {
    this.router.navigate(['/pedido', pedido.mesaId]); 
  } else {
    this.router.navigate(['/pedido/orden', pedido.id]); 
  }
}
irAPedidoParaLlevar(id: number) {
this.router.navigate(['/pedido/orden', id]);
}
// ✅ CORREGIDO: Solo quita notificación visual, NO actualiza backend
confirmarEntrega(p: any) { 
  console.log('🔔 Quitando notificación de orden:', p.id);
  
  // Solo remover de la lista de notificaciones localmente
  const idx = this.pedidosListos.indexOf(p); 
  if(idx > -1) { 
    this.pedidosListos.splice(idx, 1); 
    this.contadorNotificaciones = Math.max(0, this.contadorNotificaciones - 1); 
  } 
  
  // ✅ IMPORTANTE: La orden permanece en estado LISTA en el backend
  // No actualizar a ENTREGADA hasta que se pague en caja
  // Esto permite que el mesero aún pueda enviar la cuenta
  
  console.log('✅ Notificación removida. Orden sigue en estado LISTA.');
}
marcarComoVista(p: any) {
this.confirmarEntrega(p);
}
Logout() {
this.authService.logout();
}
ngOnDestroy() {
this.subscriptions.unsubscribe();
}
}