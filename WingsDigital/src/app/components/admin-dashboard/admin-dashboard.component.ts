import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ProductosService } from '../../services/productos.service';
import { MesaService } from '../../services/mesa.service';
import Swal from 'sweetalert2'; // Importamos SweetAlert2 para las alertas bonitas

// Interface for typing
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
  public tabActiva: 'resumen' | 'sucursales' | 'personal' | 'menu' | 'categorias' | 'turnos' | 'mesas' = 'resumen';

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
  public esEdicionSucursal: boolean = false; 
  public idSucursalEdicion: number | null = null; 
  public sucursalForm: any = { nombre: '', direccion: '', telefono: '' };

  // Modal Personal
  public mostrarModalEmpleado: boolean = false;
  // Variables para controlar si la sucursal está fija (desde la tarjeta)
  public esSucursalFija: boolean = false; 
  public nombreSucursalFija: string = '';

  public empleadoForm: any = { 
    nombre: '', 
    email: '', 
    password: '', 
    rol: 'GERENTE', 
    sucursalId: null 
  };

  // Modal Mesas
  public mesas: any[] = [];
  public mostrarModalMesa: boolean = false;
  public esEdicionMesa: boolean = false;
  public mesaForm: any = { 
    numero: '', 
    capacidad: 4, 
    tipo: 'cuadrada', 
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
    private mesaService: MesaService,
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
          direccion: s.direccion, 
          telefono: s.telefono,   
          activa: s.activa, // Viene de la BD (1 o 0)
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
  // LÓGICA DE SUCURSALES (CREAR / EDITAR / SOFT DELETE)
  // ==========================================

  // 1. Abrir Modal para CREAR
  abrirModalSucursal(): void {
    this.esEdicionSucursal = false;
    this.idSucursalEdicion = null;
    this.sucursalForm = { nombre: '', direccion: '', telefono: '' };
    this.mostrarModalSucursal = true;
  }

  // 2. Abrir Modal para EDITAR
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

  // 3. Guardar con SweetAlert
  guardarSucursal(): void {
    if (!this.sucursalForm.nombre) {
      Swal.fire('Atención', 'El nombre de la sucursal es obligatorio', 'warning');
      return;
    }

    const obs = (this.esEdicionSucursal && this.idSucursalEdicion)
      ? this.adminService.editarSucursal(this.idSucursalEdicion, this.sucursalForm)
      : this.adminService.crearSucursal(this.sucursalForm);

    obs.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.esEdicionSucursal ? 'Actualizado' : 'Creado',
          text: this.esEdicionSucursal ? 'Sucursal actualizada correctamente' : 'Sucursal creada con éxito',
          timer: 2000,
          showConfirmButton: false
        });
        this.cerrarModalSucursal();
        this.cargarDatosDelSistema();
      },
      error: (err) => Swal.fire('Error', 'No se pudo guardar: ' + err.message, 'error')
    });
  }

  // 4. Activar / Desactivar con SweetAlert (Reemplaza a eliminar)
  alternarEstadoSucursal(sucursal: Sucursal): void {
    const nuevoEstado = !sucursal.activa;
    const accion = nuevoEstado ? 'Reactivar' : 'Desactivar';
    const colorBoton = nuevoEstado ? '#28a745' : '#d33';

    Swal.fire({
      title: `¿${accion} Sucursal?`,
      html: `Estás a punto de <b>${accion.toLowerCase()}</b> la sucursal <b>"${sucursal.nombre}"</b>.<br><br>
             ${nuevoEstado ? 'Volverá a estar operativa en el sistema.' : 'Dejará de aparecer en los reportes, pero sus datos históricos se conservan.'}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: colorBoton,
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.editarSucursal(sucursal.id, { activa: nuevoEstado }).subscribe({
          next: () => {
            sucursal.activa = nuevoEstado;
            this.recalcularEstadisticasGenerales();
            Swal.fire('¡Listo!', `La sucursal ha sido ${nuevoEstado ? 'activada' : 'desactivada'}.`, 'success');
          },
          error: (err) => Swal.fire('Error', 'No se pudo cambiar el estado.', 'error')
        });
      }
    });
  }

  // Mantengo esta función por compatibilidad con el HTML anterior si lo tuvieras cacheado,
  // pero redirige a la nueva lógica.
  eliminarSucursal(id: number): void {
    const sucursal = this.sucursales.find(s => s.id === id);
    if (sucursal) {
      this.alternarEstadoSucursal(sucursal);
    }
  }

  // ==========================================
  // LÓGICA DE PERSONAL (VALIDACIÓN CORREGIDA)
  // ==========================================

  // Abrir modal general (botón superior)
  abrirModalEmpleado(): void {
    this.esSucursalFija = false; 
    this.nombreSucursalFija = '';
    this.empleadoForm = { 
      nombre: '', 
      email: '', 
      password: '', 
      rol: 'GERENTE', 
      sucursalId: null 
    };
    this.mostrarModalEmpleado = true;
  }

  // Abrir modal desde tarjeta de sucursal
  agregarPersonalASucursal(sucursal: any): void {
    this.esSucursalFija = true; 
    this.nombreSucursalFija = sucursal.nombre;
    
    this.empleadoForm = { 
      nombre: '', 
      email: '', 
      password: '', 
      rol: 'GERENTE', 
      sucursalId: sucursal.id 
    };
    this.mostrarModalEmpleado = true;
  }

  cerrarModalEmpleado(): void {
    this.mostrarModalEmpleado = false;
  }

guardarEmpleado(): void {
  // 1. Validaciones básicas
  if (!this.empleadoForm.nombre || !this.empleadoForm.email || !this.empleadoForm.password) {
    Swal.fire('Datos Incompletos', 'Por favor completa todos los campos obligatorios.', 'warning');
    return;
  }

  if (!this.empleadoForm.sucursalId) {
    Swal.fire('Falta Sucursal', 'Debes asignar el empleado a una sucursal.', 'warning');
    return;
  }

  // 2. ✅ VALIDACIÓN CON DEBUGGING
  if (this.empleadoForm.rol === 'GERENTE') {
    const sucursalIdTarget = Number(this.empleadoForm.sucursalId);
    
    // 🔍 DEBUGGING: Ver qué estamos comparando
    console.log('🔍 Sucursal seleccionada:', sucursalIdTarget);
    console.log('🔍 Tipo:', typeof sucursalIdTarget);
    console.log('🔍 Lista completa de personal:', this.personal);
    
    // Filtrar gerentes activos
    const gerentesActivos = this.personal.filter(p => {
      const esGerente = p.rol === 'GERENTE';
      const estaActivo = p.activo === true || p.activo === 1;
      const sucursalId = Number(p.sucursalId);
      
      console.log(`👤 ${p.nombre}:`, {
        sucursalId: sucursalId,
        sucursalIdTarget: sucursalIdTarget,
        sonIguales: sucursalId === sucursalIdTarget,
        rol: p.rol,
        esGerente: esGerente,
        activo: p.activo,
        estaActivo: estaActivo
      });
      
      return esGerente && estaActivo;
    });
    
    console.log('👔 Gerentes activos encontrados:', gerentesActivos);
    
    // Buscar si hay gerente en ESTA sucursal
    const gerenteExistente = gerentesActivos.find(g => {
      const sucursalDelGerente = Number(g.sucursalId);
      return sucursalDelGerente === sucursalIdTarget;
    });

    console.log('❓ ¿Hay gerente en esta sucursal?', gerenteExistente);

    if (gerenteExistente) {
      const nombreSucursal = this.sucursales.find(s => s.id === sucursalIdTarget)?.nombre || 'la sucursal';
      
      Swal.fire({
        icon: 'error',
        title: 'Acción Denegada',
        html: `La sucursal <b>"${nombreSucursal}"</b> ya tiene un Gerente activo:<br><br>
               <i class="fas fa-user-tie" style="font-size: 2rem; color: #555; margin: 10px;"></i><br>
               <b>${gerenteExistente.nombre}</b><br>
               <small>Sucursal ID: ${gerenteExistente.sucursalId}</small><br><br>
               No es posible asignar dos gerentes principales a la misma sucursal.`,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Entendido'
      });
      return; 
    }
    
    console.log('✅ No hay gerente en esta sucursal, procediendo...');
  }

  // 3. Proceder con el registro
  this.cargando = true;
  this.adminService.crearEmpleado(this.empleadoForm).subscribe({
    next: (res) => {
      this.cargando = false;
      Swal.fire({
        icon: 'success',
        title: '¡Registrado!',
        text: 'El personal ha sido registrado correctamente.',
        timer: 2000,
        showConfirmButton: false
      });
      this.cerrarModalEmpleado();
      this.cargarDatosDelSistema(); 
    },
    error: (err) => {
      this.cargando = false;
      console.error('❌ Error del backend:', err);
      Swal.fire('Error', err.error?.message || err.message, 'error');
    }
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

  cambiarTab(tab: 'resumen' | 'sucursales' | 'personal' | 'menu' | 'categorias' | 'turnos' | 'mesas'): void {
    this.tabActiva = tab;
    if (tab === 'mesas') {
      this.cargarMesas();
    }
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

  // ==========================================
  // ✅ LÓGICA DE GESTIÓN DE MESAS
  // ==========================================

  cargarMesas(): void {
    this.mesaService.getMesas().subscribe({
      next: (data) => {
        this.mesas = data;
        console.log('✅ Mesas cargadas:', this.mesas.length);
      },
      error: (err) => console.error('❌ Error cargando mesas:', err)
    });
  }

  abrirModalMesa(sucursalId?: number): void {
    this.esEdicionMesa = false;
    this.mesaForm = { 
      numero: '', 
      capacidad: 4, 
      tipo: 'cuadrada', 
      sucursalId: sucursalId || null 
    };
    this.mostrarModalMesa = true;
  }

  editarMesa(mesa: any): void {
    this.esEdicionMesa = true;
    this.mesaForm = { ...mesa };
    this.mostrarModalMesa = true;
  }

  cerrarModalMesa(): void {
    this.mostrarModalMesa = false;
  }

  guardarMesa(): void {
    if (!this.mesaForm.numero || !this.mesaForm.capacidad || !this.mesaForm.sucursalId) {
      Swal.fire('Error', 'Por favor completa todos los campos requeridos', 'error');
      return;
    }

    if (this.esEdicionMesa && this.mesaForm.id) {
      // Editar mesa existente
      this.mesaService.editarMesa(this.mesaForm.id, this.mesaForm).subscribe({
        next: () => {
          Swal.fire('¡Éxito!', 'Mesa actualizada correctamente', 'success');
          this.cargarMesas();
          this.cerrarModalMesa();
        },
        error: (err) => {
          Swal.fire('Error', err.error?.message || 'Error al actualizar mesa', 'error');
        }
      });
    } else {
      // Crear nueva mesa
      this.mesaService.crearMesa(this.mesaForm).subscribe({
        next: () => {
          Swal.fire('¡Éxito!', 'Mesa creada correctamente', 'success');
          this.cargarMesas();
          this.cerrarModalMesa();
        },
        error: (err) => {
          Swal.fire('Error', err.error?.message || 'Error al crear mesa', 'error');
        }
      });
    }
  }

  eliminarMesa(mesa: any): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la mesa ${mesa.numero}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.mesaService.eliminarMesa(mesa.id).subscribe({
          next: () => {
            Swal.fire('Eliminada', 'Mesa eliminada correctamente', 'success');
            this.cargarMesas();
          },
          error: (err) => {
            Swal.fire('Error', err.error?.message || 'No se pudo eliminar la mesa', 'error');
          }
        });
      }
    });
  }

  get mesasPorSucursal(): any {
    const agrupadas: any = {};
    this.mesas.forEach(mesa => {
      const sucursal = this.sucursales.find(s => s.id === mesa.sucursalId);
      const nombreSucursal = sucursal?.nombre || 'Sin sucursal';
      
      if (!agrupadas[nombreSucursal]) {
        agrupadas[nombreSucursal] = [];
      }
      agrupadas[nombreSucursal].push(mesa);
    });
    return agrupadas;
  }
}