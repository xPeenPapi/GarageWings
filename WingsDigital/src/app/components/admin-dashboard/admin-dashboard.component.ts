import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 Importante para los formularios
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ProductosService } from '../../services/productos.service';

// Interfaces para tipado
interface Sucursal {
  id: number;
  nombre: string;
  empleadosActivos: number;
  horaPico: string;
  ventas: number;
  ordenes: number;
  ticketPromedio: number;
  activa: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], // 👈 Asegúrate de incluir FormsModule
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  // ==========================================
  // VARIABLES DE ESTADO
  // ==========================================
  public nombreAdmin: string = '';
  public horaActual: string = '';
  public cargando: boolean = true;

  // Filtros y Navegación
  public sucursalSeleccionada: string = 'todas';
  public tabActiva: 'resumen' | 'sucursales' | 'personal' | 'menu' | 'categorias' | 'turnos' = 'resumen';

  // Datos Reales
  public sucursales: Sucursal[] = [];
  public personal: any[] = [];
  public productos: any[] = [];
  
  // Gráficas Dinámicas (CSS Gradients)
  public pieChartRol: string = 'conic-gradient(#ccc 0% 100%)';
  
  // ==========================================
  // VARIABLES PARA MODALES (NUEVO)
  // ==========================================
  
  // Modal Sucursal
  public mostrarModalSucursal: boolean = false;
  public sucursalForm: any = { nombre: '', direccion: '', telefono: '' };

  // Modal Personal
  public mostrarModalEmpleado: boolean = false;
  public empleadoForm: any = { 
    nombre: '', 
    email: '', 
    password: '', 
    rol: 'GERENTE', 
    sucursalId: null 
  };

  // ==========================================
  // ESTADÍSTICAS CALCULADAS
  // ==========================================
  public estadisticas = {
    ventasTotales: 0,
    ordenesDelDia: 0,
    personalActivo: 0,
    sucursalesActivas: 0
  };

  public resumenGeneral = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
    total: 0
  };

  public personalPorRol = { meseros: 0, gerentes: 0, cocineros: 0, baristas: 0, cajeros: 0 };
  public estadoPersonal = { activo: 0, vacaciones: 0, inactivo: 0 };
  public platillos: number = 0;

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private productosService: ProductosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.actualizarHora();
    this.cargarDatosDelSistema();

    setInterval(() => {
      this.actualizarHora();
    }, 60000);
  }

  cargarDatosUsuario(): void {
    const user = this.authService.currentUser;
    if (user) {
      this.nombreAdmin = user.nombre;
    }
  }

  actualizarHora(): void {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  // ==========================================
  // LOGICA DE CARGA DE DATOS
  // ==========================================
  
  cargarDatosDelSistema(): void {
    this.cargando = true;

    // 1. Cargar Sucursales
    this.adminService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales = data.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          activa: s.activa,
          empleadosActivos: s.empleados?.length || 0,
          horaPico: '20:00', // Dato simulado si el backend no lo envía
          ventas: s.totalVentasDia || 0, 
          ordenes: s.totalOrdenesDia || 0,
          ticketPromedio: s.ticketPromedio || 0
        }));

        this.recalcularEstadisticasGenerales();
      },
      error: (err) => console.error('Error cargando sucursales', err)
    });

    // 2. Cargar Personal Global
    this.adminService.getAllPersonal().subscribe({
      next: (data) => {
        this.personal = data;
        this.calcularEstadisticasPersonal();
        this.generarGraficasPersonal();
      }
    });

    // 3. Cargar Menú
    this.productosService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        this.platillos = data.length;
      }
    });
  }

  // ==========================================
  // LÓGICA DE SUCURSALES (CREAR)
  // ==========================================

  abrirModalSucursal(): void {
    this.sucursalForm = { nombre: '', direccion: '', telefono: '' };
    this.mostrarModalSucursal = true;
  }

  cerrarModalSucursal(): void {
    this.mostrarModalSucursal = false;
  }

  guardarSucursal(): void {
    if (!this.sucursalForm.nombre) {
      alert('El nombre de la sucursal es obligatorio');
      return;
    }

    this.adminService.crearSucursal(this.sucursalForm).subscribe({
      next: (res) => {
        alert('Sucursal creada con éxito ✅');
        this.cerrarModalSucursal();
        this.cargarDatosDelSistema(); // Recargar datos para ver la nueva sucursal
      },
      error: (err) => alert('Error al crear sucursal: ' + err.message)
    });
  }

  // ==========================================
  // LÓGICA DE PERSONAL (CREAR GERENTE/EMPLEADO)
  // ==========================================

  abrirModalEmpleado(): void {
    // Reseteamos el formulario
    this.empleadoForm = { 
      nombre: '', 
      email: '', 
      password: '', 
      rol: 'GERENTE', // Por defecto sugerimos crear Gerente
      sucursalId: null 
    };
    this.mostrarModalEmpleado = true;
  }

  cerrarModalEmpleado(): void {
    this.mostrarModalEmpleado = false;
  }

  guardarEmpleado(): void {
    // Validaciones básicas
    if (!this.empleadoForm.nombre || !this.empleadoForm.email || !this.empleadoForm.password) {
      alert('Por favor completa los campos obligatorios (Nombre, Email, Contraseña).');
      return;
    }

    if (!this.empleadoForm.sucursalId) {
      alert('Debes asignar el empleado a una sucursal.');
      return;
    }

    this.adminService.crearEmpleado(this.empleadoForm).subscribe({
      next: (res) => {
        alert('Personal registrado correctamente ✅');
        this.cerrarModalEmpleado();
        this.cargarDatosDelSistema(); // Recargar para ver al nuevo empleado en las gráficas
      },
      error: (err) => alert('Error al registrar personal: ' + err.message)
    });
  }

  // ==========================================
  // CÁLCULOS Y GRÁFICAS
  // ==========================================

  recalcularEstadisticasGenerales(): void {
    this.estadisticas.ventasTotales = 0;
    this.estadisticas.ordenesDelDia = 0;
    this.estadisticas.sucursalesActivas = 0;

    this.sucursales.forEach(suc => {
      if (suc.activa) {
        this.estadisticas.sucursalesActivas++;
        this.estadisticas.ventasTotales += Number(suc.ventas);
        this.estadisticas.ordenesDelDia += Number(suc.ordenes);
      }
    });

    this.resumenGeneral.total = this.estadisticas.ventasTotales;
    this.resumenGeneral.efectivo = this.estadisticas.ventasTotales * 0.30;
    this.resumenGeneral.tarjeta = this.estadisticas.ventasTotales * 0.50;
    this.resumenGeneral.transferencia = this.estadisticas.ventasTotales * 0.20;
  }

  calcularEstadisticasPersonal(): void {
    this.personalPorRol = { meseros: 0, gerentes: 0, cocineros: 0, baristas: 0, cajeros: 0 };
    this.estadoPersonal = { activo: 0, vacaciones: 0, inactivo: 0 };
    this.estadisticas.personalActivo = 0;

    this.personal.forEach(p => {
      const rol = p.rol?.toUpperCase();
      if (rol === 'MESERO') this.personalPorRol.meseros++;
      else if (rol === 'GERENTE') this.personalPorRol.gerentes++;
      else if (rol === 'COCINA') this.personalPorRol.cocineros++;
      else if (rol === 'BARRA') this.personalPorRol.baristas++;
      else if (rol === 'CAJA') this.personalPorRol.cajeros++;

      if (p.activo) {
        this.estadoPersonal.activo++;
        this.estadisticas.personalActivo++;
      } else {
        this.estadoPersonal.inactivo++;
      }
      if (p.enVacaciones) this.estadoPersonal.vacaciones++;
    });
  }

  generarGraficasPersonal(): void {
    const total = this.personal.length || 1;
    const p = this.personalPorRol;
    
    let deg = 0;
    const roles = [
      { val: p.meseros, col: '#4285f4' }, 
      { val: p.cocineros, col: '#fbbc04' },
      { val: p.cajeros, col: '#34a853' }, 
      { val: p.baristas, col: '#ea4c89' }, 
      { val: p.gerentes, col: '#8e44ad' }
    ];

    let gradiente = 'conic-gradient(';
    roles.forEach((r, i) => {
      const avance = (r.val / total) * 360;
      gradiente += `${r.col} ${deg}deg ${deg + avance}deg`;
      if (i < roles.length - 1) gradiente += ', ';
      deg += avance;
    });
    gradiente += ')';
    this.pieChartRol = gradiente;
  }

  // ==========================================
  // INTERACCIÓN UI
  // ==========================================

  seleccionarSucursal(sucursal: string): void {
    this.sucursalSeleccionada = sucursal;
  }

  cambiarTab(tab: 'resumen' | 'sucursales' | 'personal' | 'menu' | 'categorias' | 'turnos'): void {
    this.tabActiva = tab;
  }

  cerrarSesion(): void {
    this.authService.logout();
  }

  get ventasPorSucursalData(): { sucursal: string; ventas: number }[] {
    return this.sucursales
      .filter(s => s.activa)
      .map(s => ({
        sucursal: s.nombre,
        ventas: s.ventas
      }));
  }

  get maxVentas(): number {
    const max = Math.max(...this.sucursales.map(s => s.ventas));
    return max > 0 ? max : 1; 
  }

  calcularPorcentaje(valor: number, total: number): number {
    return total > 0 ? (valor / total) * 100 : 0;
  }
}