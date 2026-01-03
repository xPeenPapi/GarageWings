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
  // ✅ Identificador visual de unión
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

  public ordenesParaLlevarActivas: any[] = [];
  public filtroActual: 'TODAS' | 'DISPONIBLES' | 'OCUPADAS' = 'TODAS';
  public textoBusqueda: string = ''; 

  public totalMesas = 0;
  public totalDisponibles = 0;
  public totalOcupadas = 0;
  public totalReservadas = 0;
  public totalMisMesas = 0;

  public pedidosListos: ComandaCompleta[] = [];
  public contadorNotificaciones = 0;
  public mostrarListaNotificaciones = false;

  public mostrarModalCliente = false; 
  public mostrarModalComensales = false; 
  public nombreClienteTemp = '';
  public comensalesTemp: number = 2;
  public mesaSeleccionadaTemp: MesaVisual | null = null;

  public modoUnion = false;
  public mesaPrincipalUnion: MesaVisual | null = null;

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
    this.subscriptions.add(interval(60000).subscribe(() => { this.cargarMesas(); this.cargarOrdenesParaLlevar(); }));
    this.subscriptions.add(interval(5000).subscribe(() => { this.verificarNotificacionesComida(); this.cargarOrdenesParaLlevar(); }));
  }

  // ==========================================
  // ✅ PERSISTENCIA Y LIMPIEZA AUTOMÁTICA
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

  // ✅ CORRECCIÓN: Liberar backend si el padre se liberó
  limpiarUnionesObsoletas(listaMesasBackend: any[]) {
      const uniones = JSON.parse(localStorage.getItem('uniones_mesas') || '{}');
      let cambios = false;
      
      Object.keys(uniones).forEach(keyHijaId => {
          const hijaId = Number(keyHijaId);
          const padreId = uniones[hijaId];

          const mesaPadre = listaMesasBackend.find(m => m.id === padreId);
          const mesaHija = listaMesasBackend.find(m => m.id === hijaId);
          
          const estadoPadre = mesaPadre ? mesaPadre.estado.toLowerCase() : 'desconocido';

          // Si el padre NO existe O está LIBRE/DISPONIBLE -> Rompemos la unión y liberamos la hija
          if (!mesaPadre || estadoPadre === 'disponible' || estadoPadre === 'libre') {
              
              delete uniones[hijaId]; // Borrar del storage
              cambios = true;
              
              // 🔥 Si la hija sigue ocupada en backend, LA LIBERAMOS AUTOMÁTICAMENTE
              if (mesaHija && mesaHija.estado.toLowerCase() === 'ocupada') {
                  this.mesaService.actualizarEstadoMesa(hijaId, 'disponible', '').subscribe({
                      next: () => {
                          setTimeout(() => this.cargarMesas(), 500); // Recargar para ver cambio
                      }
                  });
              }
          }
      });

      if (cambios) {
          localStorage.setItem('uniones_mesas', JSON.stringify(uniones));
      }
  }

  // ✅ Calcular capacidad total (Padre + Hijos)
  obtenerCapacidadTotal(mesa: MesaVisual): number {
      let capacidadTotal = mesa.capacidad;
      const mesasHijas = this.mesas.filter(m => m.mesaPadreId === mesa.id);
      mesasHijas.forEach(hija => {
          capacidadTotal += hija.capacidad;
      });
      return capacidadTotal;
  }

  // ==========================================

  cargarMesas() {
    this.mesaService.getMesas().subscribe({
      next: (data) => {
        const listaMesas = data as any[];
        
        // 1. Limpieza de lógica
        this.limpiarUnionesObsoletas(listaMesas);

        this.mesas = listaMesas.map(m => {
            let padreId = m.mesaPadreId || this.obtenerUnionLocal(m.id);
            let estadoVisual = m.estado ? m.estado.toLowerCase() : 'disponible';

            if (padreId) {
                const parentTable = listaMesas.find(p => p.id === padreId);
                // Si el padre está libre, liberamos visualmente al hijo
                if (!parentTable || parentTable.estado.toLowerCase() === 'disponible') {
                    padreId = null;
                    estadoVisual = 'disponible'; 
                } else {
                    estadoVisual = 'ocupada'; 
                }
            }

            return {
              ...m,
              id: m.id,
              numero: m.numero,
              capacidad: m.capacidad || 4,
              estado: estadoVisual,
              tipo: m.tipo || (m.capacidad > 2 ? 'cuadrada' : 'rectangular'),
              mesero: m.meseroNombre, 
              meseroId: m.meseroId,
              comensales: m.comensales || 0,
              horaInicio: m.horaInicio,
              tiempoTranscurrido: this.calcularTiempo(m.horaInicio),
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

  cargarOrdenesParaLlevar() { this.pedidosService.obtenerPendientes().subscribe({ next: (ordenes: any[]) => { this.ordenesParaLlevarActivas = ordenes.filter(o => !o.mesaId && o.estado !== 'CANCELADA' && o.estado !== 'PAGADA' && o.estado !== 'CERRADA'); } }); }
  
  verificarNotificacionesComida() { this.pedidosService.obtenerPendientes().subscribe({ next: (ordenes: any[]) => { this.mesas.forEach(mesa => { const ordenMesa = ordenes.find(o => o.mesaId === mesa.id); if (ordenMesa && ordenMesa.estado === 'LISTA') { mesa.tienePedidoListo = true; } else { mesa.tienePedidoListo = false; } }); }, error: (err) => console.error(err) }); }
  
  calcularTiempo(fecha?: string): string { if (!fecha) return ''; const inicio = new Date(fecha).getTime(); const ahora = new Date().getTime(); const diffMinutos = Math.floor((ahora - inicio) / 60000); const horas = Math.floor(diffMinutos / 60); const minutos = diffMinutos % 60; if (horas > 0) return `${horas}h ${minutos}min`; return `${minutos} min`; }
  
  esTiempoExcedido(fecha?: string): boolean { if (!fecha) return false; const inicio = new Date(fecha).getTime(); const ahora = new Date().getTime(); return (ahora - inicio) > (2 * 60 * 60 * 1000); }
  
  actualizarContadores() { this.totalMesas = this.mesas.length; this.totalDisponibles = this.mesas.filter(m => m.estado === 'disponible').length; this.totalOcupadas = this.mesas.filter(m => m.estado === 'ocupada').length; this.totalReservadas = this.mesas.filter(m => m.estado === 'reservada').length; this.totalMisMesas = this.mesas.filter(m => m.meseroId === this.usuarioActualId).length; }
  
  get mesasFiltradas(): MesaVisual[] { let lista = this.mesas; if (this.filtroActual === 'DISPONIBLES') lista = lista.filter(m => m.estado === 'disponible'); if (this.filtroActual === 'OCUPADAS') lista = lista.filter(m => m.estado === 'ocupada'); if (this.textoBusqueda.trim() !== '') { const texto = this.textoBusqueda.toLowerCase(); lista = lista.filter(m => m.numero.toLowerCase().includes(texto) || (m.mesero && m.mesero.toLowerCase().includes(texto)) ); } return lista; }
  
  setFiltro(filtro: 'TODAS' | 'DISPONIBLES' | 'OCUPADAS') { this.filtroActual = filtro; }

  // ==========================================
  // ✅ MÉTODOS PARA MODALES
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
  // ✅ LÓGICA DE SELECCIÓN Y APERTURA (CORREGIDA)
  // ==========================================
  
  seleccionarMesa(mesa: MesaVisual): void {
    
    // CASO 1: MODO UNIÓN ACTIVO
    if (this.modoUnion) {
      if (!this.mesaPrincipalUnion) {
        // PASO 1: SELECCIONAR MESA PRINCIPAL (PADRE)
        
        // 1. Si la mesa ya es hija de otra, no puede ser padre.
        if (mesa.mesaPadreId) {
            this.mostrarAlerta("Esta mesa ya está unida a otra. Selecciona la mesa principal.", 'error');
            return;
        }

        // ✅ 2. Aceptamos mesa disponible o mesa ocupada como padre.
        this.mesaPrincipalUnion = mesa;

      } else {
        // PASO 2: SELECCIONAR MESA SECUNDARIA (HIJA)
        
        // 1. Si tocas la misma mesa, deseleccionamos (Reset)
        if (mesa.id === this.mesaPrincipalUnion.id) {
            this.mesaPrincipalUnion = null; 
            return;
        }

        // 2. Procesamos la unión
        this.procesarUnion(mesa);
      }
      return;
    }

    // CASO 2: MODO NORMAL
    if (mesa.estado === 'ocupada') {
      if (mesa.mesaPadreId) {
          this.router.navigate(['/pedido', mesa.mesaPadreId]); // Ir al padre
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

  confirmarAperturaMesa() {
    if (!this.mesaSeleccionadaTemp) return;
    
    if (this.comensalesTemp < 1) { 
        this.mostrarAlerta("Mínimo 1 persona", 'error'); 
        return; 
    }

    // ✅ VALIDACIÓN DE CAPACIDAD MEJORADA
    const capacidadTotal = this.obtenerCapacidadTotal(this.mesaSeleccionadaTemp);

    if (this.comensalesTemp > capacidadTotal) {
        this.mostrarAlerta(`Capacidad excedida. Máximo ${capacidadTotal} personas (considerando uniones).`, 'error');
        return;
    }
    
    this.crearOrdenBackend(this.mesaSeleccionadaTemp.id, this.comensalesTemp);
  }

  toggleModoUnion() {
    this.modoUnion = !this.modoUnion;
    this.mesaPrincipalUnion = null;
    this.mesaSeleccionadaTemp = null;
  }

  procesarUnion(segundaMesa: MesaVisual) {
    if (!this.mesaPrincipalUnion) return;
    
    // La mesa a unir DEBE estar disponible
    if (segundaMesa.estado !== 'disponible') { 
        this.mostrarAlerta("La mesa a unir debe estar disponible (vacía).", 'error'); 
        return; 
    }

    this.mostrarConfirmacion(`¿Unir la Mesa ${segundaMesa.numero} a la Mesa ${this.mesaPrincipalUnion.numero}?`, () => {
        
        // 1. Guardar Unión
        this.guardarUnionLocal(segundaMesa.id, this.mesaPrincipalUnion!.id);
        
        // 2. Feedback visual inmediato
        segundaMesa.mesaPadreId = this.mesaPrincipalUnion!.id;
        segundaMesa.estado = 'ocupada';

        // 3. Backend (Marcar como ocupada)
        this.mesaService.actualizarEstadoMesa(segundaMesa.id, 'ocupada', this.nombreMesero).subscribe({
            next: () => {
                
                // 🔥 LÓGICA DE AUTO-APERTURA (FLUXO RÁPIDO)
                const padreEstabaDisponible = this.mesaPrincipalUnion?.estado === 'disponible';
                this.toggleModoUnion(); // Salir de modo unión

                if (padreEstabaDisponible) {
                    // Si el padre estaba vacío, asumimos que quieren abrir la orden YA.
                    // Abrimos el modal automáticamente.
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
        if (mesaId) this.router.navigate(['/pedido', mesaId]);
        else this.router.navigate(['/pedido/orden', orden.id]); 
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
        if(pedido.estado === 'PAGADA' || pedido.estado === 'CANCELADA') this.cargarMesas();
        if (pedido.mesero === this.nombreMesero) this.agregarNotificacion(pedido);
      }
    }));
  }

  agregarNotificacion(pedido: ComandaCompleta) {
    if (!this.pedidosListos.find(p => p.id === pedido.id)) {
      this.pedidosListos.unshift(pedido);
      this.contadorNotificaciones++;
      this.audio?.play().catch(()=>{});
    }
  }
  toggleListaNotificaciones() { this.mostrarListaNotificaciones = !this.mostrarListaNotificaciones; }
  limpiarNotificaciones() { this.pedidosListos = []; this.contadorNotificaciones = 0; this.mostrarListaNotificaciones = false; }
  irAMesa(pedido: ComandaCompleta) { this.marcarComoVista(pedido); if(pedido.mesaId) this.router.navigate(['/pedido', pedido.mesaId]); else this.router.navigate(['/pedido/orden', pedido.id]); }
  irAPedidoParaLlevar(id: number) { this.router.navigate(['/pedido/orden', id]); }
  marcarComoVista(p: any) { const idx = this.pedidosListos.indexOf(p); if(idx > -1) { this.pedidosListos.splice(idx, 1); this.contadorNotificaciones = Math.max(0, this.contadorNotificaciones - 1); } }
  Logout() { this.authService.logout(); }
  ngOnDestroy() { this.subscriptions.unsubscribe(); }
}