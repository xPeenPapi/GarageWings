import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GerenteService, DashboardData, Empleado, Turno } from '../../services/gerente.service';
// Importación de servicios para la nueva funcionalidad de configuración
import { MesaService } from '../../services/mesa.service';
import { ProductosService } from '../../services/productos.service';

interface ResumenDia {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
}

interface EstadisticaDia {
  ventasTotales: number;
  ordenesTotales: number;
  personalActivo: number;
  ticketPromedio: number;
}

@Component({
  selector: 'app-gerente-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gerente-dashboard.component.html',
  styleUrls: ['./gerente-dashboard.component.css']
})
export class GerenteDashboardComponent implements OnInit {
  
  // ==========================================
  // 1. VARIABLES GENERALES
  // ==========================================
  public nombreGerente: string = '';
  public sucursalNombre: string = ''; 
  public sucursalId: number = 0;      
  public horaActual: string = '';
  public cargando: boolean = true;
  
  public fechaSeleccionada: string = ''; 
  public maxDate: string = ''; 

  public mostrarAlertaModal: boolean = false;
  public textoAlerta: string = '';

  // Tab actualizada para incluir la nueva vista de configuración
  public tabActiva: 'resumen' | 'personal' | 'turnos' | 'configuracion' = 'resumen';

  // ==========================================
  // 2. VARIABLES DEL DASHBOARD (RESUMEN)
  // ==========================================
  public resumenDia: ResumenDia = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  public totalGeneral: number = 0;
  public estadisticas: EstadisticaDia = {
    ventasTotales: 0,
    ordenesTotales: 0,
    personalActivo: 0,
    ticketPromedio: 0
  };

  // ==========================================
  // 3. VARIABLES DE PERSONAL (RRHH)
  // ==========================================
  public empleados: Empleado[] = [];
  public mostrarModalEmpleado: boolean = false;
  public esEdicion: boolean = false;
  public empleadoForm: any = { nombre: '', email: '', password: '', rol: 'MESERO' };

  // ==========================================
  // 4. VARIABLES DE TURNOS
  // ==========================================
  public turnos: Turno[] = [];
  public mostrarModalTurno: boolean = false;
  public turnoForm: any = { 
    empleadoId: null,
    fecha: '',
    horaInicio: '09:00',
    horaFin: '17:00',
    notas: ''
  };

  // ==========================================
  // 5. VARIABLES DE CONFIGURACIÓN
  // ==========================================
  // Usamos any[] para evitar errores de compilación TS2339 en el HTML si la interfaz no está actualizada
  public mesas: any[] = [];
  public categorias: any[] = [];
  public productos: any[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private gerenteService: GerenteService,
    private mesaService: MesaService,
    private productosService: ProductosService
  ) {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0]; 
    this.fechaSeleccionada = hoyStr;
    this.maxDate = hoyStr; 
  }

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.actualizarHora();
    this.cargarDatosDashboard();
    
    setInterval(() => {
      this.actualizarHora();
    }, 60000);
  }

  mostrarAlerta(mensaje: string): void {
    this.textoAlerta = mensaje;
    this.mostrarAlertaModal = true;
  }

  cerrarAlerta(): void {
    this.mostrarAlertaModal = false;
  }

  cargarDatosUsuario(): void {
    const user = this.authService.currentUser;
    if (user) {
      this.nombreGerente = user.nombre;
      this.sucursalId = (user as any).sucursalId || 1; 
      this.sucursalNombre = (user as any).sucursalNombre || 'Garage Sushis Centro';
    }
  }

  actualizarHora(): void {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString('es-MX', { 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  }

  cambiarFecha(): void {
    if (this.fechaSeleccionada > this.maxDate) {
      this.mostrarAlerta("No puedes ver reportes del futuro 🔮. Se mostrará el día de hoy.");
      this.fechaSeleccionada = this.maxDate;
    }
    this.cargarDatosDashboard();
  }

  cargarDatosDashboard(): void {
    this.cargando = true;
    this.gerenteService.getDashboardData(this.fechaSeleccionada).subscribe({
      next: (data: DashboardData) => {
        this.resumenDia = { ...data.resumenPago };
        this.totalGeneral = data.totalGeneral;
        this.estadisticas = {
          ventasTotales: data.ventasTotales,
          ordenesTotales: data.ordenesTotales,
          personalActivo: data.personalActivo,
          ticketPromedio: data.ticketPromedio
        };
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error dashboard:', error);
        this.cargando = false;
      }
    });
  }

  // ==========================================
  // LÓGICA DE PERSONAL
  // ==========================================
  
  cargarEmpleados(): void {
    this.gerenteService.getEmpleados().subscribe({
      next: (data) => this.empleados = data,
      error: (err) => console.error('Error cargando empleados:', err)
    });
  }

  abrirModalNuevo(): void {
    this.esEdicion = false;
    this.empleadoForm = { nombre: '', email: '', password: '', rol: 'MESERO' };
    this.mostrarModalEmpleado = true;
  }

  abrirModalEditar(emp: Empleado): void {
    this.esEdicion = true;
    this.empleadoForm = { ...emp, password: '' }; 
    this.mostrarModalEmpleado = true;
  }

  cerrarModalEmpleado(): void {
    this.mostrarModalEmpleado = false;
  }

  guardarEmpleado(): void {
    // 🛡️ VALIDACIÓN SEGURIDAD: Bloqueo de creación de Gerentes por otro Gerente
    if (this.empleadoForm.rol === 'GERENTE') {
      this.mostrarAlerta('Acceso Denegado: No tienes permisos para crear o editar cuentas de nivel GERENTE.');
      return;
    }

    if (!this.empleadoForm.nombre || !this.empleadoForm.email) {
      this.mostrarAlerta('Por favor completa el nombre y el email.');
      return;
    }

    const datosEmpleado = { ...this.empleadoForm, sucursalId: this.sucursalId };

    if (this.esEdicion && this.empleadoForm.id) {
      this.gerenteService.editarEmpleado(this.empleadoForm.id, datosEmpleado).subscribe({
        next: () => { this.cargarEmpleados(); this.cerrarModalEmpleado(); },
        error: (err) => this.mostrarAlerta('Error al actualizar: ' + err.message)
      });
    } else {
      this.gerenteService.crearEmpleado(datosEmpleado).subscribe({
        next: () => { this.cargarEmpleados(); this.cerrarModalEmpleado(); },
        error: (err) => this.mostrarAlerta('Error al crear: ' + err.message)
      });
    }
  }

  despedirEmpleado(id: number): void {
    if(confirm('¿Estás seguro de desactivar a este empleado?')) {
      this.gerenteService.eliminarEmpleado(id).subscribe({
        next: () => this.cargarEmpleados(),
        error: (err) => this.mostrarAlerta('Error al eliminar: ' + err.message)
      });
    }
  }

  // ==========================================
  // LÓGICA DE TURNOS
  // ==========================================

  cargarTurnos(): void {
    this.gerenteService.getTurnos().subscribe({
      next: (data) => {
        this.turnos = data.map((t: any) => ({
          ...t,
          empleadoNombre: t.empleado?.nombre || 'Desconocido',
          empleadoRol: t.empleado?.rol || ''
        }));
      },
      error: (err) => console.error('Error cargando turnos', err)
    });
  }

  abrirModalTurno(): void {
    this.turnoForm = { empleadoId: null, fecha: '', horaInicio: '09:00', horaFin: '17:00', notas: '' };
    this.mostrarModalTurno = true;
  }

  cerrarModalTurno(): void {
    this.mostrarModalTurno = false;
  }

  guardarTurno(): void {
    if(!this.turnoForm.empleadoId || !this.turnoForm.fecha) {
      this.mostrarAlerta('Por favor selecciona un empleado y una fecha.');
      return;
    }
    this.gerenteService.crearTurno({ ...this.turnoForm, sucursalId: this.sucursalId }).subscribe({
      next: () => { this.cargarTurnos(); this.cerrarModalTurno(); },
      error: (err) => this.mostrarAlerta('Error creando turno: ' + err.message)
    });
  }

  eliminarTurno(id: number): void {
    if(confirm('¿Estás seguro de eliminar este turno?')) {
      this.gerenteService.eliminarTurno(id).subscribe({
        next: () => this.cargarTurnos(),
        error: (err) => this.mostrarAlerta('Error al eliminar turno')
      });
    }
  }

  // ==========================================
  // LÓGICA DE CONFIGURACIÓN (ENABLE/DISABLE)
  // ==========================================

  cargarDatosConfiguracion(): void {
    this.mesaService.getMesas().subscribe(data => this.mesas = data);
    this.productosService.getCategorias().subscribe(data => this.categorias = data);
    this.productosService.getProductos().subscribe(data => this.productos = data);
  }

  // Desactivar/Activar Mesa (Usamos el estado 'mantenimiento')
  toggleMesa(mesa: any): void {
    const nuevoEstado = mesa.estado === 'mantenimiento' ? 'disponible' : 'mantenimiento';
    this.mesaService.actualizarEstadoMesa(mesa.id, nuevoEstado, '').subscribe({
      next: () => this.cargarDatosConfiguracion(),
      error: () => this.mostrarAlerta('No se pudo cambiar el estado de la mesa.')
    });
  }

  // Desactivar/Activar Producto (Agotado)
  toggleProducto(prod: any): void {
    const nuevoEstado = !prod.activo;
    // El GerenteService debe tener este método patchProducto
    this.gerenteService.patchProducto(prod.id, { activo: nuevoEstado }).subscribe({
      next: () => this.cargarDatosConfiguracion(),
      error: () => this.mostrarAlerta('Error al actualizar disponibilidad del platillo.')
    });
  }

  // Desactivar/Activar Categoría
  toggleCategoria(cat: any): void {
    const nuevoEstado = !cat.activo;
    // El GerenteService debe tener este método patchCategoria
    this.gerenteService.patchCategoria(cat.id, { activo: nuevoEstado }).subscribe({
      next: () => this.cargarDatosConfiguracion(),
      error: () => this.mostrarAlerta('Error al actualizar disponibilidad de la categoría.')
    });
  }

  // ==========================================
  // NAVEGACIÓN Y UTILIDADES
  // ==========================================

  cambiarTab(tab: 'resumen' | 'personal' | 'turnos' | 'configuracion'): void {
    this.tabActiva = tab;
    if (tab === 'personal') this.cargarEmpleados();
    else if (tab === 'resumen') this.cargarDatosDashboard();
    else if (tab === 'turnos') { this.cargarEmpleados(); this.cargarTurnos(); }
    else if (tab === 'configuracion') this.cargarDatosConfiguracion();
  }

  cerrarSesion(): void {
    this.authService.logout();
  }

  irAPersonal(): void {
    this.cambiarTab('personal');
  }

  irAReportes(): void {
    this.cambiarTab('resumen');
  }
}