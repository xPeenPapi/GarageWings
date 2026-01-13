import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GerenteService, DashboardData, Empleado, Turno } from '../../services/gerente.service';
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
  
  public nombreGerente: string = '';
  public sucursalNombre: string = ''; 
  public sucursalId: number | null = null; // ✅ Cambiar a nullable
  public horaActual: string = '';
  public cargando: boolean = true;
  
  public fechaSeleccionada: string = ''; 
  public maxDate: string = ''; 

  public mostrarAlertaModal: boolean = false;
  public textoAlerta: string = '';

  public tabActiva: 'resumen' | 'personal' | 'turnos' | 'configuracion' = 'resumen';

  public resumenDia: ResumenDia = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  public totalGeneral: number = 0;
  public estadisticas: EstadisticaDia = {
    ventasTotales: 0,
    ordenesTotales: 0,
    personalActivo: 0,
    ticketPromedio: 0
  };

  public empleados: Empleado[] = [];
  public mostrarModalEmpleado: boolean = false;
  public esEdicion: boolean = false;
  public empleadoForm: any = { nombre: '', email: '', password: '', rol: 'MESERO' };

  public turnos: Turno[] = [];
  public mostrarModalTurno: boolean = false;
  public turnoForm: any = { 
    empleadoId: null,
    fecha: '',
    horaInicio: '09:00',
    horaFin: '17:00',
    notas: ''
  };

  public mesas: any[] = [];
  public categorias: any[] = [];
  public productos: any[] = [];

  public chartGradient: string = 'conic-gradient(#ccc 0% 100%)';
  public rolesStats: any[] = [];

  // 🤖 IA PREDICCIONES
  public prediccionIA: string = '';
  public cargandoPrediccion: boolean = false;
  public mostrarPrediccion: boolean = false;
  public datosPrediccion: any = null;

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

  // ✅ MÉTODO CORREGIDO
  cargarDatosUsuario(): void {
    const user = this.authService.currentUser;
    
    if (!user) {
      console.error('❌ No hay usuario en sesión');
      this.authService.logout();
      return;
    }

    this.nombreGerente = user.nombre;
    this.sucursalId = user.sucursalId;
    this.sucursalNombre = user.sucursalNombre || 'Sin Sucursal';

    // 🔍 DEBUGGING
    console.log('═══════════════════════════════');
    console.log('👤 Gerente:', this.nombreGerente);
    console.log('🏢 Sucursal:', this.sucursalNombre);
    console.log('🔢 SucursalId:', this.sucursalId);
    console.log('═══════════════════════════════');

    // ✅ Validar que tenga sucursal asignada
    if (!this.sucursalId) {
      this.mostrarAlerta('⚠️ Tu cuenta no tiene una sucursal asignada. Contacta al administrador.');
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
    if (!this.sucursalId) {
      console.error('❌ No se puede cargar dashboard sin sucursalId');
      return;
    }

    this.cargando = true;
    
    // ✅ ACTUALIZADO: Usar getDashboardStats() que llama a /personal/dashboard
    // Este endpoint automáticamente filtra por la sucursal del gerente logueado
    this.gerenteService.getDashboardStats().subscribe({
      next: (data: DashboardData) => {
        console.log('📊 Dashboard recibido:', data);
        
        // Actualizar estadísticas
        this.estadisticas = {
          ventasTotales: data.ventasTotales,
          ordenesTotales: data.ordenesTotales,
          personalActivo: data.personalActivo,
          ticketPromedio: data.ticketPromedio
        };

        // Actualizar gráfica de roles
        if (data.roles) {
          this.rolesStats = [
            { rol: 'Mesero', cantidad: data.roles.meseros, color: '#3b82f6' },
            { rol: 'Cocina', cantidad: data.roles.cocina, color: '#ec4899' },
            { rol: 'Barra', cantidad: data.roles.barra, color: '#10b981' },
            { rol: 'Caja', cantidad: data.roles.caja, color: '#f59e0b' },
            { rol: 'Gerente', cantidad: data.roles.gerentes, color: '#8b5cf6' }
          ];
          this.calcularGraficaRoles();
        }

        // Si vienen datos de resumen de pago (opcional)
        if (data.resumenPago) {
          this.resumenDia = { ...data.resumenPago };
          this.totalGeneral = data.totalGeneral || 0;
        }

        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar dashboard:', error);
        this.mostrarAlerta('Error al cargar los datos del dashboard');
        this.cargando = false;
      }
    });
  }

  // ==========================================
  // LÓGICA DE PERSONAL
  // ==========================================
  
  cargarEmpleados(): void {
    this.gerenteService.getEmpleados().subscribe({
      next: (data) => {
        this.empleados = data.filter(emp => emp.rol !== 'GERENTE');
        this.calcularGraficaRoles();
      },
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
    if (this.empleadoForm.rol === 'GERENTE') {
      this.mostrarAlerta('Acceso Denegado: Solo el Administrador puede gestionar Gerentes.');
      return;
    }

    if (!this.empleadoForm.nombre || !this.empleadoForm.email) {
      this.mostrarAlerta('Por favor completa el nombre y el email.');
      return;
    }

    // ✅ Incluir sucursalId del gerente actual
    const datosEmpleado = { 
      ...this.empleadoForm, 
      sucursalId: this.sucursalId 
    };

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
    const hoy = new Date().toISOString().split('T')[0];
    this.turnoForm = { empleadoId: null, fecha: hoy, horaInicio: '09:00', horaFin: '17:00', notas: '' };
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
      next: () => { 
        this.cargarTurnos();
        this.cerrarModalTurno(); 
        this.mostrarAlerta('Turno asignado correctamente ✅');
      },
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
  // LÓGICA DE CONFIGURACIÓN
  // ==========================================

  cargarDatosConfiguracion(): void {
    this.mesaService.getMesas().subscribe(data => this.mesas = data);
    this.productosService.getCategorias().subscribe(data => this.categorias = data);
    this.productosService.getProductos().subscribe(data => this.productos = data);
  }

  toggleMesa(mesa: any): void {
    const estaEnMantenimiento = mesa.estado === 'MANTENIMIENTO' || mesa.estado === 'mantenimiento';
    const nuevoEstado = estaEnMantenimiento ? 'DISPONIBLE' : 'MANTENIMIENTO';

    this.mesaService.actualizarEstadoMesa(mesa.id, nuevoEstado, '').subscribe({
      next: () => this.cargarDatosConfiguracion(),
      error: () => this.mostrarAlerta('No se pudo cambiar el estado de la mesa.')
    });
  }

  toggleProducto(prod: any): void {
    const nuevoEstado = !prod.activo;
    this.gerenteService.patchProducto(prod.id, { activo: nuevoEstado }).subscribe({
      next: () => this.cargarDatosConfiguracion(),
      error: () => this.mostrarAlerta('Error al actualizar disponibilidad del platillo.')
    });
  }

  toggleCategoria(cat: any): void {
    const nuevoEstado = !cat.activo;
    this.gerenteService.patchCategoria(cat.id, { activo: nuevoEstado }).subscribe({
      next: () => this.cargarDatosConfiguracion(),
      error: () => this.mostrarAlerta('Error al actualizar disponibilidad de la categoría.')
    });
  }

  // ==========================================
  // PREDICCIONES CON IA
  // ==========================================

  solicitarPrediccionIA(): void {
    if (!this.sucursalId) {
      this.mostrarAlerta('⚠️ No se puede generar predicción sin sucursal asignada');
      return;
    }

    console.log('🚀 Solicitando predicción para sucursal:', this.sucursalId);
    this.cargandoPrediccion = true;
    
    this.gerenteService.obtenerPrediccionVentas().subscribe({
      next: (response) => {
        console.log('📦 Respuesta completa:', response);
        
        if (response.success) {
          console.log('✅ Predicción exitosa');
          this.prediccionIA = response.prediccion;
          this.datosPrediccion = response.datos;
          this.mostrarPrediccion = true;
        } else {
          console.warn('⚠️ Error en la predicción:', response.error);
          console.log('📊 Datos disponibles:', response.datos);
          this.mostrarAlerta('⚠️ ' + (response.error || 'No se pudo generar la predicción'));
          // Mostrar datos aunque no haya predicción
          if (response.datos) {
            this.datosPrediccion = response.datos;
          }
        }
        
        this.cargandoPrediccion = false;
      },
      error: (error) => {
        console.error('❌ Error completo:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Error message:', error.error);
        
        let mensaje = 'Error al conectar con el servicio de predicciones';
        if (error.error?.message) {
          mensaje = error.error.message;
        } else if (error.message) {
          mensaje = error.message;
        }
        
        this.mostrarAlerta(mensaje);
        this.cargandoPrediccion = false;
      }
    });
  }

  cerrarPrediccion(): void {
    this.mostrarPrediccion = false;
  }

  cambiarTab(tab: 'resumen' | 'personal' | 'turnos' | 'configuracion'): void {
    this.tabActiva = tab;
    if (tab === 'personal') this.cargarEmpleados();
    else if (tab === 'resumen') this.cargarDatosDashboard();
    else if (tab === 'turnos') { 
      this.cargarEmpleados();
      this.cargarTurnos(); 
    }
    else if (tab === 'configuracion') this.cargarDatosConfiguracion();
  }

  calcularGraficaRoles(): void {
    if (this.empleados.length === 0) {
      this.chartGradient = 'conic-gradient(#f1f5f9 0% 100%)';
      return;
    }

    const conteo: any = { MESERO: 0, COCINA: 0, BARRA: 0, CAJA: 0 };
    this.empleados.forEach(e => {
      if (conteo[e.rol] !== undefined) conteo[e.rol]++;
    });

    const colores: any = {
      MESERO: '#4285f4',
      COCINA: '#ea4c89',
      BARRA: '#34a853',
      CAJA: '#fbbc04'
    };

    let currentDeg = 0;
    const total = this.empleados.length;
    let gradientParts = [];
    this.rolesStats = [];

    for (const rol in conteo) {
      const count = conteo[rol];
      if (count > 0) {
        const percentage = (count / total) * 100;
        const degrees = (count / total) * 360;
        const color = colores[rol];

        gradientParts.push(`${color} 0 ${currentDeg + degrees}deg`);
        
        this.rolesStats.push({
          nombre: rol,
          cantidad: count,
          color: color,
          porcentaje: Math.round(percentage)
        });

        currentDeg += degrees;
      }
    }

    let gradientString = 'conic-gradient(';
    let acumulado = 0;
    
    this.rolesStats.forEach((stat, index) => {
        const grados = (stat.cantidad / total) * 360;
        gradientString += `${stat.color} ${acumulado}deg ${acumulado + grados}deg`;
        if (index < this.rolesStats.length - 1) gradientString += ', ';
        acumulado += grados;
    });
    gradientString += ')';

    this.chartGradient = gradientString;
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