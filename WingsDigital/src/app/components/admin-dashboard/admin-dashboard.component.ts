import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ProductosService } from '../../services/productos.service';

// Interfaces para tipado
interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
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
  imports: [CommonModule, FormsModule],
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
  public pieChartEstado: string = 'conic-gradient(#ccc 0% 100%)';
  
  // ==========================================
  // VARIABLES PARA MODALES
  // ==========================================
  
  // Modal Sucursal
  public mostrarModalSucursal: boolean = false;
  public esEdicionSucursal: boolean = false; // 👈 Nuevo: Para saber si editamos
  public idSucursalEdicion: number | null = null; // 👈 Nuevo: ID de la sucursal a editar
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
          direccion: s.direccion, // Importante para editar
          telefono: s.telefono,   // Importante para editar
          activa: s.activa,
          empleadosActivos: s.empleados?.length || 0,
          horaPico: '20:00',
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
  // LÓGICA DE SUCURSALES (CREAR / EDITAR / ELIMINAR)
  // ==========================================

  // 1. Abrir Modal para CREAR
  abrirModalSucursal(): void {
    this.esEdicionSucursal = false;
    this.idSucursalEdicion = null;
    this.sucursalForm = { nombre: '', direccion: '', telefono: '' };
    this.mostrarModalSucursal = true;
  }

  // 2. Abrir Modal para EDITAR (Carga datos existentes)
  editarSucursal(sucursal: any): void {
    this.esEdicionSucursal = true;
    this.idSucursalEdicion = sucursal.id;
    this.sucursalForm = { 
      nombre: sucursal.nombre, 
      direccion: sucursal.direccion || '', 
      telefono: sucursal.telefono || '' 
    };
    this.mostrarModalSucursal = true;
  }

  cerrarModalSucursal(): void {
    this.mostrarModalSucursal = false;
  }

  // 3. Guardar (Maneja POST y PUT)
  guardarSucursal(): void {
    if (!this.sucursalForm.nombre) {
      alert('El nombre de la sucursal es obligatorio');
      return;
    }

    if (this.esEdicionSucursal && this.idSucursalEdicion) {
      // --- MODO EDICIÓN ---
      this.adminService.editarSucursal(this.idSucursalEdicion, this.sucursalForm).subscribe({
        next: () => {
          alert('Sucursal actualizada correctamente ✅');
          this.cerrarModalSucursal();
          this.cargarDatosDelSistema();
        },
        error: (err) => alert('Error al actualizar: ' + err.message)
      });
    } else {
      // --- MODO CREACIÓN ---
      this.adminService.crearSucursal(this.sucursalForm).subscribe({
        next: () => {
          alert('Sucursal creada con éxito ✅');
          this.cerrarModalSucursal();
          this.cargarDatosDelSistema();
        },
        error: (err) => alert('Error al crear: ' + err.message)
      });
    }
  }

  // 4. Eliminar Sucursal
  eliminarSucursal(id: number): void {
    if(confirm('⚠️ ¿Estás seguro de eliminar esta sucursal permanentemente?\nEsta acción no se puede deshacer y podría afectar a los empleados asignados.')) {
      this.adminService.eliminarSucursal(id).subscribe({
        next: () => {
          alert('Sucursal eliminada.');
          this.cargarDatosDelSistema();
        },
        error: (err) => alert('No se pudo eliminar la sucursal (puede tener datos relacionados).')
      });
    }
  }

  // ==========================================
  // LÓGICA DE PERSONAL (CREAR Y ASIGNAR DIRECTO)
  // ==========================================

  abrirModalEmpleado(): void {
    this.empleadoForm = { 
      nombre: '', 
      email: '', 
      password: '', 
      rol: 'GERENTE', 
      sucursalId: null 
    };
    this.mostrarModalEmpleado = true;
  }

  // ⚡ NUEVO: Atajo para agregar personal desde la tarjeta de sucursal
  agregarPersonalASucursal(sucursal: any): void {
    this.empleadoForm = { 
      nombre: '', 
      email: '', 
      password: '', 
      rol: 'GERENTE', // Por defecto sugerimos Gerente
      sucursalId: sucursal.id // Pre-seleccionamos la sucursal
    };
    this.mostrarModalEmpleado = true;
  }

  cerrarModalEmpleado(): void {
    this.mostrarModalEmpleado = false;
  }

  guardarEmpleado(): void {
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
        this.cargarDatosDelSistema(); 
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

    // Gráfica de estado (Activo/Inactivo)
    const totalStatus = (this.estadoPersonal.activo + this.estadoPersonal.vacaciones + this.estadoPersonal.inactivo) || 1;
    const activePct = (this.estadoPersonal.activo / totalStatus) * 100;
    const vacationPct = (this.estadoPersonal.vacaciones / totalStatus) * 100;
    
    this.pieChartEstado = `conic-gradient(#20c997 0% ${activePct}%, #fbbc04 ${activePct}% ${activePct + vacationPct}%, #e74c3c ${activePct + vacationPct}% 100%)`;
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