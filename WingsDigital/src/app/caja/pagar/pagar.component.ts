import { Component, OnInit, OnDestroy, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faShop, faClock, faRightFromBracket, faFileInvoiceDollar, faHandHoldingDollar,
  faCheck, faBox, faUser, faShoppingCart, faList, faCircleXmark, faEllipsis,
  faObjectGroup, faScissors, faArrowUpFromBracket, faWallet, faTriangleExclamation,
  faMoneyBillWave, faCreditCard, faExchangeAlt, faCoins, faCashRegister
} from '@fortawesome/free-solid-svg-icons';
import { Subscription, forkJoin, interval } from 'rxjs';
import { jsPDF } from 'jspdf';

import { CobrarModalComponent } from '../cobrar-modal/cobrar-modal.component';
import { DividirCuentaModalComponent, ClienteCuenta } from '../dividir-cuenta-modal/dividir-cuenta-modal.component';
import { SocketService } from '../../services/socket.service';
import { PedidosService } from '../../services/pedidos.service';
import { AuthService } from '../../services/auth.service';

export interface Orden {
  id: number;
  idsAgrupados?: number[]; 
  mesa: number | string; 
  mesero: string;
  hora: string;
  total: number;
  estado: string;
  items: { nombre: string; cantidad: number; precioUnitario: number; notas?: string; opciones?: any }[];
  seleccionada?: boolean; 
  propina?: number;
  metodoPago?: string;
  subcuentas?: ClienteCuenta[];
  clienteNombre?: string; 
  fechaCierre?: Date;
}

@Component({
  selector: 'app-pagar',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, CobrarModalComponent, DividirCuentaModalComponent, FormsModule],
  templateUrl: './pagar.component.html',
  styleUrls: ['./pagar.component.css']
})
export class PagarComponent implements OnInit, OnDestroy {
  
  @ViewChild(DividirCuentaModalComponent) splitModal!: DividirCuentaModalComponent;

  iconos = {
    cajero: faShop, reloj: faClock, cerrarSesion: faRightFromBracket,
    ventas: faFileInvoiceDollar, pendiente: faHandHoldingDollar, procesadas: faBox,
    check: faCheck, mesero: faUser, cobrar: faShoppingCart, dividir: faScissors, 
    unir: faObjectGroup, ordenes: faList, cerrarTurno: faCircleXmark, 
    flechaUnir: faArrowUpFromBracket, wallet: faWallet, alerta: faTriangleExclamation,
    efectivo: faMoneyBillWave, tarjeta: faCreditCard, transferencia: faExchangeAlt, 
    otros: faCoins, cajaRegistradora: faCashRegister
  };

  cajero = { nombre: '', turnoDesde: new Date() };
  
  public turnoAbierto = false; 
  public mostrarModalApertura = false; 
  public montoInicial: number = 0; 
  private inicioTurnoTimestamp: number = 0;

  public activeTab: 'pedidos' | 'dividir' | 'unir' = 'pedidos';
  public activeFilter: string = 'todos';

  public ventasTurno: number = 0.00;
  public propinasTurno: number = 0.00;
  public pendienteCobro: number = 0.00;
  public ordenesProcesadas: number = 0;
  
  public ventasEfectivo: number = 0.00;
  public ventasTarjeta: number = 0.00;
  public ventasTransferencia: number = 0.00;
  public ventasOtros: number = 0.00;
  
  public ordenParaCobrar: Orden | null = null;
  public mostrarModalCobro = false;
  public ordenParaDividir: Orden | null = null;
  public mostrarModalDividir = false;
  
  public clienteSubCuenta: ClienteCuenta | null = null;
  public ordenPadreSubCuenta: Orden | null = null;

  public mostrarConfirmacion = false;
  public mensajeConfirmacion = '';
  public accionConfirmacion: () => void = () => {};
  public mostrarModalCierreTurno = false;

  listosParaCobrar: Orden[] = [];
  pagadosHoy: Orden[] = [];

  private mesasPagadasLocamente = new Set<string>();
  
  // ✅ NUEVO: Estructura para manejar las uniones en memoria y persistencia
  // Key: ID Orden Principal, Value: Array de IDs Hijos
  private unionesTemporales: { [key: number]: number[] } = {}; 

  private socketSub: Subscription | undefined;
  private refreshSub: Subscription | undefined;
  private audio: HTMLAudioElement | null = null;

  constructor(
    private router: Router, private socketService: SocketService,
    private pedidosService: PedidosService, private authService: AuthService, private zone: NgZone
  ) {
    this.audio = new Audio('assets/sounds/notification.mp3');
    this.cajero.nombre = this.authService.getNombreUsuario() || 'Cajero';
  }

  ngOnInit(): void {
    this.verificarEstadoTurno();
    this.recuperarUnionesDeStorage(); // ✅ Recuperar uniones al recargar página
    this.conectarSocket();
    this.refreshSub = interval(5000).subscribe(() => { 
        if (this.turnoAbierto) this.cargarDatosDelDia();
    });
  }

  // --- PERSISTENCIA DE UNIONES (NUEVO) ---
  guardarUnionesEnStorage() {
    localStorage.setItem('uniones_temporales_caja', JSON.stringify(this.unionesTemporales));
  }

  recuperarUnionesDeStorage() {
    const data = localStorage.getItem('uniones_temporales_caja');
    if (data) {
        this.unionesTemporales = JSON.parse(data);
    }
  }

  // --- PERSISTENCIA LOCAL (DIVISIÓN) ---
  guardarDivisionEnStorage(ordenId: number, subcuentas: ClienteCuenta[]) {
    localStorage.setItem(`split_order_${ordenId}`, JSON.stringify(subcuentas));
  }

  obtenerDivisionDeStorage(ordenId: number): ClienteCuenta[] | null {
    const data = localStorage.getItem(`split_order_${ordenId}`);
    return data ? JSON.parse(data) : null;
  }

  borrarDivisionDeStorage(ordenId: number) {
    localStorage.removeItem(`split_order_${ordenId}`);
  }

  // --- CONTROL DE TURNO ---
  verificarEstadoTurno() {
    const fechaInicio = localStorage.getItem('inicioTurno');
    const fondoCaja = localStorage.getItem('montoInicial');

    if (fechaInicio) {
      this.turnoAbierto = true;
      this.cajero.turnoDesde = new Date(fechaInicio);
      this.inicioTurnoTimestamp = this.cajero.turnoDesde.getTime();
      this.montoInicial = fondoCaja ? Number(fondoCaja) : 0;
      this.cargarDatosDelDia();
    } else {
      this.turnoAbierto = false;
      this.montoInicial = 0;
    }
  }

  iniciarApertura() {
    this.montoInicial = 0;
    this.mostrarModalApertura = true;
  }

  confirmarAperturaCaja() {
    if (this.montoInicial < 0) {
      alert("El monto no puede ser negativo.");
      return;
    }
    this.cajero.turnoDesde = new Date();
    this.inicioTurnoTimestamp = this.cajero.turnoDesde.getTime();
    localStorage.setItem('inicioTurno', this.cajero.turnoDesde.toISOString());
    localStorage.setItem('montoInicial', this.montoInicial.toString());
    this.turnoAbierto = true;
    this.mostrarModalApertura = false;
    this.cargarDatosDelDia();
  }

  cargarDatosDelDia() {
    if (!this.turnoAbierto) return;

    this.pedidosService.obtenerOrdenesDelDia().subscribe({
      next: (pedidosBackend: any[]) => { 
        const calcularTotal = (items: any[]) => (items || []).reduce((acc: number, i: any) => acc + (Number(i.precioUnitario) * i.cantidad), 0);

        // 1. PAGADOS
        const pagadas = pedidosBackend.filter(p => {
            const esPagada = p.estado === 'PAGADA';
            if (!esPagada) return false;
            if (calcularTotal(p.items) <= 0) return false; 
            const fechaCierre = new Date(p.cerradaEn || p.updatedAt || p.creadaEn).getTime();
            return fechaCierre >= this.inicioTurnoTimestamp;
        });
        
        const pagadasReales = pagadas.map(p => {
            const orden = this.convertirAOrden(p);
            const splitStorage = this.obtenerDivisionDeStorage(orden.id);
            if(splitStorage) {
                orden.subcuentas = splitStorage;
                orden.estado = 'DIVIDIDA';
            }
            return orden;
        });

        this.pagadosHoy = [...pagadasReales, ...this.pagadosHoy.filter(local => !pagadasReales.some(real => real.id === local.id))];

        // 2. PENDIENTES
        const pendientes = pedidosBackend.filter(p => {
            const estado = p.estado;
            const total = calcularTotal(p.items);
            if (total <= 0) return false;
            
            let tituloMesa = p.identificadorMesa;
            if (!tituloMesa) {
              if (p.mesa) tituloMesa = `Mesa ${p.mesa.numero}`;
              else tituloMesa = `Pedido para llevar de ${p.notaGeneral || 'Cliente'}`; 
            }

            if (this.mesasPagadasLocamente.has(tituloMesa.toString())) {
                return false;
            }

            return estado === 'POR_COBRAR' || estado === 'DIVIDIDA' || estado === 'PARCIAL';
        });
        
        const ordenesPlanas = pendientes.map(p => this.convertirAOrden(p));
        
        // 1. Agrupar por mesa backend (lógica normal)
        let listos = this.agruparPedidosPorMesa(ordenesPlanas);

        // 2. ✅ APLICAR UNIONES TEMPORALES (Fix para que no se borren a los 5s)
        listos = this.aplicarUnionesLogicas(listos);

        this.listosParaCobrar = listos;
        
        this.calcularTotales();
      },
      error: (err) => console.error('Error cargando caja:', err)
    });
  }

  // ✅ NUEVA FUNCIÓN: Aplica las uniones guardadas en this.unionesTemporales a los datos frescos
  aplicarUnionesLogicas(ordenes: Orden[]): Orden[] {
    // Convertimos el array a un mapa para acceso rápido
    const mapaOrdenes = new Map(ordenes.map(o => [o.id, o]));
    const idsHijosGlobales = new Set<number>();

    // Recorremos las uniones guardadas
    Object.keys(this.unionesTemporales).forEach(key => {
        const idPadre = Number(key);
        const idsHijos = this.unionesTemporales[idPadre];
        
        const ordenPadre = mapaOrdenes.get(idPadre);

        if (ordenPadre) {
            // Si existe el padre, le sumamos los hijos que encontremos
            idsHijos.forEach(idHijo => {
                const ordenHijo = mapaOrdenes.get(idHijo);
                if (ordenHijo) {
                    // Sumar y combinar
                    ordenPadre.total += ordenHijo.total;
                    ordenPadre.items = [...ordenPadre.items, ...ordenHijo.items];
                    
                    if (!ordenPadre.idsAgrupados) ordenPadre.idsAgrupados = [ordenPadre.id];
                    
                    // Si el hijo ya tenía agrupados (raro pero posible), los traemos, si no, solo el ID
                    if (ordenHijo.idsAgrupados) {
                        ordenPadre.idsAgrupados.push(...ordenHijo.idsAgrupados);
                    } else {
                        ordenPadre.idsAgrupados.push(ordenHijo.id);
                    }

                    // Marcamos para actualizar nombre visual solo si no se ha hecho ya
                    if (!ordenPadre.mesa.toString().includes('(+')) {
                         ordenPadre.mesa = `${ordenPadre.mesa} (+ Union)`;
                    }

                    // Marcar hijo para eliminar de la lista principal
                    idsHijosGlobales.add(idHijo);
                }
            });
        }
    });

    // Retornamos la lista sin los hijos que ya fueron absorbidos
    return ordenes.filter(o => !idsHijosGlobales.has(o.id));
  }

  conectarSocket() {
    if (!this.socketService.isConnected()) this.socketService.reconnect();
    this.socketSub = this.socketService.escucharPedidosParaCobrar().subscribe((pedido) => {
      this.zone.run(() => { 
        if(this.turnoAbierto) {
            if(this.audio) this.audio.play().catch(() => {});
            this.cargarDatosDelDia(); 
        }
      });
    });
  }

  agruparPedidosPorMesa(ordenes: Orden[]): Orden[] {
    const mapaMesas = new Map<string, Orden>();
    
    ordenes.forEach(orden => {
      const claveMesa = orden.mesa.toString();
      if (mapaMesas.has(claveMesa)) {
        const ordenExistente = mapaMesas.get(claveMesa)!;
        ordenExistente.total += orden.total;
        ordenExistente.items = [...ordenExistente.items, ...orden.items];
        if (!ordenExistente.idsAgrupados) ordenExistente.idsAgrupados = [ordenExistente.id];
        ordenExistente.idsAgrupados.push(orden.id);
      } else {
        orden.idsAgrupados = [orden.id];
        mapaMesas.set(claveMesa, orden);
      }
    });

    const ordenesAgrupadas = Array.from(mapaMesas.values());

    // Recuperar splits del storage
    ordenesAgrupadas.forEach(orden => {
        const divisionGuardada = this.obtenerDivisionDeStorage(orden.id);
        if (divisionGuardada) {
            orden.subcuentas = divisionGuardada;
            orden.estado = 'DIVIDIDA';
            
            const todoPagado = orden.subcuentas.every(c => c.pagado);
            if (todoPagado) {
               this.mesasPagadasLocamente.add(orden.mesa.toString());
            }
        }
    });

    return ordenesAgrupadas.filter(o => !this.mesasPagadasLocamente.has(o.mesa.toString()));
  }

  filtrarVista(filtro: string) { this.activeFilter = filtro; this.activeTab = 'pedidos'; }
  cambiarTab(tab: 'pedidos' | 'dividir' | 'unir') { this.activeTab = tab; if(tab === 'unir') this.listosParaCobrar.forEach(o => o.seleccionada = false); if(tab === 'pedidos') this.activeFilter = 'todos'; }
  
  abrirConfirmacion(mensaje: string, accion: () => void) { this.mensajeConfirmacion = mensaje; this.accionConfirmacion = accion; this.mostrarConfirmacion = true; }
  cancelarConfirmacion() { this.mostrarConfirmacion = false; this.accionConfirmacion = () => {}; }
  confirmarAccion() { this.accionConfirmacion(); this.mostrarConfirmacion = false; }
  
  // --- UNIR CUENTAS (LOGICA CORREGIDA) ---
  toggleSeleccionMesa(orden: Orden) { 
    orden.seleccionada = !orden.seleccionada; 
  }

  obtenerMesasSeleccionadas() { 
    return this.listosParaCobrar.filter(o => o.seleccionada); 
  }
  
  ejecutarUnirCuentas() { 
    const seleccionadas = this.obtenerMesasSeleccionadas();
    
    if (seleccionadas.length < 2) {
        alert("Selecciona al menos 2 cuentas para unir.");
        return; 
    }

    const cuentaPrincipal = seleccionadas[0];
    const cuentasAUnir = seleccionadas.slice(1);
    const nombresAUnir = cuentasAUnir.map(c => c.mesa).join(', ');

    this.abrirConfirmacion(`¿Cobrar la cuenta de ${nombresAUnir} junto con ${cuentaPrincipal.mesa}?`, () => {
        
        // 1. Guardar la definición de la unión en memoria/storage
        if (!this.unionesTemporales[cuentaPrincipal.id]) {
            this.unionesTemporales[cuentaPrincipal.id] = [];
        }

        cuentasAUnir.forEach(c => {
            this.unionesTemporales[cuentaPrincipal.id].push(c.id);
            // Si la cuenta que unimos también era padre de otras, nos traemos sus hijos (aplanar)
            if (this.unionesTemporales[c.id]) {
                this.unionesTemporales[cuentaPrincipal.id].push(...this.unionesTemporales[c.id]);
                delete this.unionesTemporales[c.id]; // Borramos la referencia vieja
            }
        });

        this.guardarUnionesEnStorage();

        // 2. Recargar datos inmediatamente para ver el cambio reflejado
        this.cargarDatosDelDia();
        
        this.activeTab = 'pedidos';
    });
  }

  // ALIAS
  ejecutarUnirMesas() {
      this.ejecutarUnirCuentas();
  }

  // --- DIVISIÓN ---
  ejecutarDividir(orden: Orden) { 
      this.ordenParaDividir = orden; 
      this.mostrarModalDividir = true; 
  }
  
  cerrarModalDividir() { 
      this.mostrarModalDividir = false; 
      this.ordenParaDividir = null; 
  }
  
  procesarDivision(clientesCreados: ClienteCuenta[]) { 
      if (this.ordenParaDividir && clientesCreados.length > 0) { 
          this.ordenParaDividir.subcuentas = clientesCreados; 
          this.ordenParaDividir.estado = 'DIVIDIDA'; 
          this.guardarDivisionEnStorage(this.ordenParaDividir.id, clientesCreados);
          this.cerrarModalDividir(); 
          this.cambiarTab('pedidos'); 
          this.listosParaCobrar = [...this.listosParaCobrar];
      } 
  }
  
  // --- COBRO ---
  onCobrarClienteIndividual(subCliente: ClienteCuenta, ordenPadre: Orden) {
      this.clienteSubCuenta = subCliente;
      this.ordenPadreSubCuenta = ordenPadre;

      const ordenTemporal: Orden = { 
          ...ordenPadre, 
          mesa: `${ordenPadre.mesa} (${subCliente.nombre})`, 
          total: subCliente.total, 
          estado: 'PARCIAL', 
          items: [], 
          clienteNombre: subCliente.nombre 
      };
      
      this.cobrar(ordenTemporal);
  }

  cobrar(orden: Orden): void { this.ordenParaCobrar = orden; this.mostrarModalCobro = true; }
  
  limpiarVariablesCobro() { 
      this.mostrarModalCobro = false; 
      this.ordenParaCobrar = null; 
      this.clienteSubCuenta = null; 
      this.ordenPadreSubCuenta = null; 
  }
  
  cerrarModalCobro() { this.limpiarVariablesCobro(); }
  cerrarSesion() { this.authService.logout(); }
  
  procesarPago(detallePago: { totalPagado: number, propina: number, metodo: string }) {
    if(!this.ordenParaCobrar) return;
    
    if (detallePago.totalPagado < this.ordenParaCobrar.total) { 
        alert(`Faltan $${(this.ordenParaCobrar.total - detallePago.totalPagado).toFixed(2)}`); 
        return; 
    }
    
    const datosPago = { propina: detallePago.propina || 0, metodoPago: detallePago.metodo };

    // 1. COBRO DE SUBCUENTA (Local)
    if (this.clienteSubCuenta && this.ordenPadreSubCuenta) {
         this.marcarSubcuentaComoPagada(this.clienteSubCuenta, this.ordenPadreSubCuenta, datosPago.metodoPago, datosPago.propina);
         this.limpiarVariablesCobro();
         return;
    }

    // 2. COBRO TOTAL NORMAL (Backend)
    const idsACobrar = this.ordenParaCobrar.idsAgrupados && this.ordenParaCobrar.idsAgrupados.length > 0 ? this.ordenParaCobrar.idsAgrupados : [this.ordenParaCobrar.id];
    const peticiones = idsACobrar.map(id => this.pedidosService.finalizarOrden(id, datosPago));
    
    forkJoin(peticiones).subscribe({
      next: () => { 
          // Si pagamos TOTAL, limpiamos storage de divisiones
          if(this.ordenParaCobrar) {
              this.borrarDivisionDeStorage(this.ordenParaCobrar.id);
              
              // ✅ TAMBIÉN LIMPIAMOS LA UNIÓN DEL STORAGE
              if (this.unionesTemporales[this.ordenParaCobrar.id]) {
                  delete this.unionesTemporales[this.ordenParaCobrar.id];
                  this.guardarUnionesEnStorage();
              }
          }
          this.cargarDatosDelDia(); 
          this.limpiarVariablesCobro(); 
      },
      error: (err: any) => alert('Error: ' + err.message)
    });
  }

  // ✅ GUARDA MÉTODO DE PAGO Y PROPINA EN LA SUBCUENTA
  marcarSubcuentaComoPagada(subCliente: ClienteCuenta, ordenPadre: Orden, metodoPago: string, propina: number) {
      if(ordenPadre && ordenPadre.subcuentas) {
          const clienteEnLista = ordenPadre.subcuentas.find(c => c.nombre === subCliente.nombre);
          if(clienteEnLista) {
              clienteEnLista.pagado = true;
              (clienteEnLista as any).metodoPago = metodoPago; 
              (clienteEnLista as any).propina = propina;
          }
          
          this.guardarDivisionEnStorage(ordenPadre.id, ordenPadre.subcuentas);

          const todosPagados = ordenPadre.subcuentas.every(c => c.pagado);
          
          if(todosPagados) {
              const ordenPagadaVisualmente: Orden = {
                  ...ordenPadre,
                  estado: 'PAGADA',
                  hora: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                  metodoPago: 'Mixto', // Se usará el desglose interno para calcular
                  total: ordenPadre.total,
                  propina: 0
              };
              
              this.pagadosHoy.push(ordenPagadaVisualmente);
              this.mesasPagadasLocamente.add(ordenPadre.mesa.toString());
              this.listosParaCobrar = this.listosParaCobrar.filter(o => o.id !== ordenPadre.id);
              
              this.finalizarOrdenPadreEnBackend(ordenPadre, metodoPago);
          }
          
          this.calcularTotales();
      }
  }

  finalizarOrdenPadreEnBackend(orden: Orden, metodo: string) {
      const datosPago = { propina: 0, metodoPago: metodo }; 
      const ids = orden.idsAgrupados || [orden.id];
      const peticiones = ids.map(id => this.pedidosService.finalizarOrden(id, datosPago));
      
      forkJoin(peticiones).subscribe({
          next: () => {
              this.mesasPagadasLocamente.delete(orden.mesa.toString());
              this.cargarDatosDelDia();
          },
          error: (e) => console.error("Error cerrando orden padre", e)
      });
  }

  // ✅ CÁLCULO DE TOTALES
  calcularTotales(): void {
    this.ventasEfectivo = 0; 
    this.ventasTarjeta = 0; 
    this.ventasTransferencia = 0; 
    this.ventasOtros = 0; 
    this.propinasTurno = 0;
    this.ventasTurno = 0;
    
    this.pendienteCobro = this.listosParaCobrar.reduce((sum, o) => {
        if(o.subcuentas && o.subcuentas.length > 0) {
            const deuda = o.subcuentas.filter(c => !c.pagado).reduce((s, c) => s + c.total, 0);
            return sum + deuda;
        }
        return sum + o.total;
    }, 0);

    for (const orden of this.pagadosHoy) {
      if (orden.subcuentas && orden.subcuentas.length > 0) {
          orden.subcuentas.forEach(sub => {
              if (sub.pagado || orden.estado === 'PAGADA') {
                  const metodo = (sub as any).metodoPago || 'Efectivo';
                  const prop = Number((sub as any).propina) || 0;
                  
                  this.sumarAlMetodo(metodo, sub.total);
                  this.propinasTurno += prop;
                  this.ventasTurno += sub.total;
              }
          });
      } 
      else {
          this.sumarAlMetodo(orden.metodoPago || 'Efectivo', orden.total);
          this.propinasTurno += (Number(orden.propina) || 0);
          this.ventasTurno += orden.total;
      }
    }
    
    for (const orden of this.listosParaCobrar) {
        if (orden.subcuentas) {
            orden.subcuentas.forEach(sub => {
                if (sub.pagado) {
                    const metodo = (sub as any).metodoPago || 'Efectivo';
                    const prop = Number((sub as any).propina) || 0;
                    
                    this.sumarAlMetodo(metodo, sub.total);
                    this.propinasTurno += prop;
                    this.ventasTurno += sub.total;
                }
            });
        }
    }

    this.ordenesProcesadas = this.pagadosHoy.length;
  }

  sumarAlMetodo(metodo: string, cantidad: number) {
      switch (metodo) {
        case 'Efectivo': this.ventasEfectivo += cantidad; break;
        case 'Tarjeta': this.ventasTarjeta += cantidad; break;
        case 'Transferencia': this.ventasTransferencia += cantidad; break;
        default: this.ventasOtros += cantidad; break;
      }
  }

  cerrarTurno() {
    const hayPendientes = this.listosParaCobrar.some(o => {
        if(o.subcuentas) return o.subcuentas.some(c => !c.pagado);
        return true;
    });

    if (hayPendientes) {
      this.abrirConfirmacion("⚠️ Aún hay mesas abiertas o cuentas divididas sin pagar.", () => {});
      return;
    }
    this.mostrarModalCierreTurno = true;
  }

  confirmarCierreTurno() {
    this.generarPDFCorte();
    localStorage.removeItem('inicioTurno');
    localStorage.removeItem('montoInicial');
    localStorage.removeItem('uniones_temporales_caja'); // Limpiar uniones al cerrar
    
    Object.keys(localStorage).forEach(key => {
        if(key.startsWith('split_order_')) localStorage.removeItem(key);
    });

    this.pagadosHoy = [];
    this.listosParaCobrar = [];
    this.montoInicial = 0;
    this.turnoAbierto = false;
    this.mostrarModalCierreTurno = false;
    this.mesasPagadasLocamente.clear();
    this.unionesTemporales = {}; // Limpiar memoria
  }

  generarPDFCorte() {
    this.calcularTotales();

    const doc = new jsPDF();
    const hoy = new Date().toLocaleString();
    doc.setFontSize(22); doc.text('Corte de Caja', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Fecha de Corte: ${hoy}`, 15, 40);
    doc.text(`Cajero: ${this.cajero.nombre}`, 15, 48);
    doc.text(`Turno Iniciado: ${this.cajero.turnoDesde.toLocaleString()}`, 15, 56);
    doc.line(15, 60, 195, 60);
    doc.setFontSize(16); doc.text('Resumen Financiero', 15, 75);
    doc.setFontSize(12);
    doc.text(`Fondo de Caja:`, 20, 85); doc.text(`$${this.montoInicial.toFixed(2)}`, 180, 85, { align: 'right' });
    doc.text(`Ventas Totales:`, 20, 95); doc.text(`$${this.ventasTurno.toFixed(2)}`, 180, 95, { align: 'right' });
    
    doc.line(15, 100, 195, 100);
    doc.text('Desglose de Ventas:', 15, 110);
    doc.setFontSize(11);
    doc.text(`Efectivo:`, 25, 120);      doc.text(`$${this.ventasEfectivo.toFixed(2)}`, 180, 120, { align: 'right' });
    doc.text(`Tarjeta:`, 25, 130);      doc.text(`$${this.ventasTarjeta.toFixed(2)}`, 180, 130, { align: 'right' });
    doc.text(`Transferencia:`, 25, 140); doc.text(`$${this.ventasTransferencia.toFixed(2)}`, 180, 140, { align: 'right' });
    doc.text(`Otros:`, 25, 150);        doc.text(`$${this.ventasOtros.toFixed(2)}`, 180, 150, { align: 'right' });
    
    doc.line(15, 160, 195, 160);
    doc.setFontSize(12);
    doc.text(`Propinas Recibidas:`, 20, 170); doc.text(`$${this.propinasTurno.toFixed(2)}`, 180, 170, { align: 'right' });

    doc.setFontSize(14);
    const totalEfectivoCaja = this.montoInicial + this.ventasEfectivo;
    doc.text(`Total Efectivo Esperado:`, 15, 190); doc.text(`$${totalEfectivoCaja.toFixed(2)}`, 180, 190, { align: 'right' });
    
    doc.save(`corte_caja_${new Date().getTime()}.pdf`);
  }

  convertirAOrden(pedido: any): Orden {
    const total = (pedido.items || []).reduce((acc: number, i: any) => acc + (Number(i.precioUnitario)*i.cantidad), 0);
    
    // ✅ Determinar título de la mesa/orden
    let tituloMesa = pedido.identificadorMesa;
    if (!tituloMesa) {
      if (pedido.mesa) {
        tituloMesa = `Mesa ${pedido.mesa.numero}`;
      } else {
        tituloMesa = `Pedido para llevar de ${pedido.notaGeneral || 'Cliente'}`; 
      }
    }
    
    // ✅ Manejar mesero correctamente (puede ser null, objeto, o string)
    let nombreMesero = 'Mesero';
    if (pedido.mesero) {
      if (typeof pedido.mesero === 'string') {
        nombreMesero = pedido.mesero;
      } else if (pedido.mesero.nombre) {
        nombreMesero = pedido.mesero.nombre;
      }
    }
    
    return {
      id: pedido.id,
      mesa: tituloMesa,
      mesero: nombreMesero,
      hora: new Date(pedido.creadaEn || pedido.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      total,
      estado: pedido.estado,
      seleccionada: false, 
      items: (pedido.items || []).map((i: any) => ({
        nombre: i.producto?.nombre || 'Producto',
        cantidad: i.cantidad,
        precioUnitario: Number(i.precioUnitario),
        notas: i.notas,
        opciones: i.opcionesElegidas
      })),
      propina: Number(pedido.propina) || 0,
      metodoPago: pedido.metodoPago || 'Efectivo',
      fechaCierre: pedido.cerradaEn ? new Date(pedido.cerradaEn) : undefined
    };
  }
  
  ngOnDestroy() { 
      if (this.socketSub) this.socketSub.unsubscribe(); 
      if (this.refreshSub) this.refreshSub.unsubscribe();
  }
}