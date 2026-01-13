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

  // ✅ Propiedades computadas para filtros
  get sucursalesActivas(): Sucursal[] {
    return this.sucursales.filter(s => s.activa);
  }

  get sucursalesFiltradas(): Sucursal[] {
    if (this.sucursalSeleccionada === 'todas') {
      return this.sucursalesActivas;
    }
    return this.sucursalesActivas.filter(s => s.nombre === this.sucursalSeleccionada);
  }

  get personalFiltrado(): any[] {
    if (this.sucursalSeleccionada === 'todas') {
      return this.personal;
    }
    const sucursal = this.sucursales.find(s => s.nombre === this.sucursalSeleccionada);
    if (!sucursal) return [];
    return this.personal.filter(emp => Number(emp.sucursalId) === Number(sucursal.id));
  }

  get productosFiltrados(): any[] {
    if (this.sucursalSeleccionada === 'todas') {
      return this.productos;
    }
    const sucursal = this.sucursales.find(s => s.nombre === this.sucursalSeleccionada);
    if (!sucursal) return [];
    return this.productos.filter(p => p.destino === 'sucursal' || Number(p.sucursalId) === Number(sucursal.id));
  }

  get mesasFiltradas(): any[] {
    if (this.sucursalSeleccionada === 'todas') {
      return this.mesas;
    }
    const sucursal = this.sucursales.find(s => s.nombre === this.sucursalSeleccionada);
    if (!sucursal) return [];
    return this.mesas.filter(m => Number(m.sucursalId) === Number(sucursal.id));
  }

  get sucursalesConEmpleados(): any[] {
    console.log('🔍 Personal completo:', this.personal);
    console.log('🏢 Sucursales activas:', this.sucursalesActivas);
    
    const sucursalesParaMostrar = this.sucursalSeleccionada === 'todas' 
      ? this.sucursalesActivas 
      : this.sucursalesActivas.filter(s => s.nombre === this.sucursalSeleccionada);
    
    return sucursalesParaMostrar.map(sucursal => {
      const empleadosDeSucursal = this.personal.filter(emp => {
        const empSucursalId = Number(emp.sucursalId);
        const sucId = Number(sucursal.id);
        const coincide = empSucursalId === sucId;
        
        if (coincide) {
          console.log(`✅ Empleado ${emp.nombre} pertenece a ${sucursal.nombre}`);
        }
        
        return coincide;
      });
      
      console.log(`📊 Sucursal ${sucursal.nombre}: ${empleadosDeSucursal.length} empleados`, empleadosDeSucursal);
      
      return {
        ...sucursal,
        empleados: empleadosDeSucursal
      };
    });
  }
  
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
  public esEdicionEmpleado: boolean = false;
  public empleadoEnEdicion: number | null = null;
  public empleadoOriginal: any = null;
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

  // Modal Productos
  public mostrarModalProducto: boolean = false;
  public esEdicionProducto: boolean = false;
  public productoForm: any = {
    nombre: '',
    descripcion: '',
    precioBase: 0,
    categoriaId: null,
    destino: 'COCINA',
    activo: true
  };

  // Modal Categorías
  public categorias: any[] = [];
  public mostrarModalCategoria: boolean = false;
  public esEdicionCategoria: boolean = false;
  public categoriaForm: any = {
    nombre: '',
    descripcion: '',
    iconoColor: '#3b82f6',
    activo: true
  };

  // Modal Turnos
  public turnos: any[] = [];
  public mostrarModalTurno: boolean = false;
  public turnoForm: any = {
    empleadoId: null,
    fecha: '',
    horaInicio: '09:00',
    horaFin: '17:00',
    notas: ''
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

  // Estadísticas filtradas según sucursal seleccionada
  get estadisticasFiltradas() {
    if (this.sucursalSeleccionada === 'todas') {
      return this.estadisticas;
    }
    
    const sucursal = this.sucursales.find(s => s.nombre === this.sucursalSeleccionada);
    if (!sucursal) {
      return {
        ventasTotales: 0,
        ordenesDelDia: 0,
        personalActivo: 0,
        sucursalesActivas: 0
      };
    }

    const personalDeSucursal = this.personal.filter(emp => 
      Number(emp.sucursalId) === Number(sucursal.id) && emp.activo && !emp.enVacaciones
    );

    return {
      ventasTotales: sucursal.ventas || 0,
      ordenesDelDia: sucursal.ordenes || 0,
      personalActivo: personalDeSucursal.length,
      sucursalesActivas: 1 // Solo 1 sucursal cuando se filtra
    };
  }

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
        console.log('📥 Personal recibido del backend:', data);
        console.log('📊 Cantidad de empleados:', data.length);
        this.personal = data;
        this.calcularEstadisticasPersonal();
        this.generarGraficasPersonal();
        console.log('📈 Estadísticas calculadas:', this.personalPorRol);
        console.log('📊 Estados del personal:', this.estadoPersonal);
      },
      error: (err) => {
        console.error('❌ Error cargando personal:', err);
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
    this.esEdicionEmpleado = false;
    this.empleadoEnEdicion = null;
    this.empleadoOriginal = null;
    this.esSucursalFija = false;
  }

  actualizarEmpleado(): void {
    const datosActualizacion: any = {
      nombre: this.empleadoForm.nombre,
      email: this.empleadoForm.email,
      rol: this.empleadoForm.rol,
      sucursalId: Number(this.empleadoForm.sucursalId)
    };

    // Solo incluir contraseña si se proporcionó una nueva
    if (this.empleadoForm.password && this.empleadoForm.password.trim() !== '') {
      datosActualizacion.password = this.empleadoForm.password;
    }

    this.adminService.editarEmpleado(this.empleadoEnEdicion!, datosActualizacion).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Los datos del empleado se actualizaron correctamente.',
          timer: 2000,
          showConfirmButton: false
        });
        this.cerrarModalEmpleado();
        this.cargarDatosDelSistema();
      },
      error: (err) => {
        console.error('❌ Error actualizando empleado:', err);
        Swal.fire('Error', err.error?.message || 'No se pudo actualizar', 'error');
      }
    });
  }

guardarEmpleado(): void {
  // 1. Validaciones básicas
  if (!this.empleadoForm.nombre || !this.empleadoForm.email) {
    Swal.fire('Datos Incompletos', 'Por favor completa nombre y email.', 'warning');
    return;
  }

  if (!this.empleadoForm.sucursalId) {
    Swal.fire('Falta Sucursal', 'Debes asignar el empleado a una sucursal.', 'warning');
    return;
  }

  // ✅ MODO EDICIÓN
  if (this.esEdicionEmpleado && this.empleadoEnEdicion) {
    // Detectar si hay cambio de sucursal
    const cambioSucursal = this.empleadoOriginal.sucursalId !== Number(this.empleadoForm.sucursalId);
    
    if (cambioSucursal) {
      const sucursalAnterior = this.sucursales.find(s => s.id === this.empleadoOriginal.sucursalId)?.nombre;
      const sucursalNueva = this.sucursales.find(s => s.id === Number(this.empleadoForm.sucursalId))?.nombre;
      
      Swal.fire({
        title: '🚚 Transferencia de Empleado',
        html: `
          <div style="text-align: left; padding: 20px;">
            <p><strong>Empleado:</strong> ${this.empleadoForm.nombre}</p>
            <p><strong>Rol:</strong> ${this.empleadoForm.rol}</p>
            <hr style="margin: 15px 0;">
            <p><i class="fas fa-arrow-right" style="color: #ef4444;"></i> <strong>De:</strong> ${sucursalAnterior}</p>
            <p><i class="fas fa-arrow-right" style="color: #10b981;"></i> <strong>A:</strong> ${sucursalNueva}</p>
            <hr style="margin: 15px 0;">
            <p style="color: #6b7280; font-size: 0.9rem;">
              <i class="fas fa-info-circle"></i> Esta transferencia actualizará toda la información del empleado incluyendo historial de turnos y accesos.
            </p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, transferir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444'
      }).then((result) => {
        if (result.isConfirmed) {
          this.actualizarEmpleado();
        }
      });
    } else {
      // No hay cambio de sucursal, actualizar directamente
      this.actualizarEmpleado();
    }
    return;
  }

  // ✅ MODO CREACIÓN (lógica existente)
  if (!this.empleadoForm.password) {
    Swal.fire('Datos Incompletos', 'La contraseña es requerida al crear un empleado.', 'warning');
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
  // GESTIÓN DE EMPLEADOS (ACCIONES)
  // ==========================================

  editarEmpleado(empleado: any): void {
    // Guardar datos originales para comparar
    this.empleadoOriginal = { ...empleado };
    this.empleadoEnEdicion = empleado.id;
    this.esEdicionEmpleado = true;
    this.esSucursalFija = false;
    
    // Prellenar el formulario con los datos del empleado
    this.empleadoForm = {
      nombre: empleado.nombre,
      email: empleado.email,
      password: '', // No prellenar la contraseña por seguridad
      rol: empleado.rol,
      sucursalId: empleado.sucursalId
    };
    
    this.mostrarModalEmpleado = true;
  }

  ponerEnVacaciones(empleado: any): void {
    const estaInactivo = !empleado.activo;
    
    if (estaInactivo) {
      // Reactivar empleado
      Swal.fire({
        title: '¿Reactivar empleado?',
        html: `<b>${empleado.nombre}</b> será reactivado y volverá a estar disponible.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, reactivar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981'
      }).then((result) => {
        if (result.isConfirmed) {
          this.adminService.editarEmpleado(empleado.id, { activo: true, enVacaciones: false }).subscribe({
            next: () => {
              Swal.fire('¡Reactivado!', `${empleado.nombre} está nuevamente activo.`, 'success');
              this.cargarDatosDelSistema();
            },
            error: (err) => Swal.fire('Error', 'No se pudo reactivar', 'error')
          });
        }
      });
    } else {
      // Poner en vacaciones
      Swal.fire({
        title: '¿Poner en vacaciones?',
        html: `<b>${empleado.nombre}</b> será marcado como "En Vacaciones".<br>Podrás reactivarlo cuando regrese.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, vacaciones',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#fbbf24'
      }).then((result) => {
        if (result.isConfirmed) {
          this.adminService.editarEmpleado(empleado.id, { activo: false, enVacaciones: true }).subscribe({
            next: () => {
              Swal.fire('¡Vacaciones asignadas!', `${empleado.nombre} está ahora en vacaciones.`, 'success');
              this.cargarDatosDelSistema();
            },
            error: (err) => Swal.fire('Error', 'No se pudo actualizar el estado', 'error')
          });
        }
      });
    }
  }

  contarMesasPorSucursal(sucursalId: number): number {
    return this.mesas.filter(m => m.sucursalId === sucursalId).length;
  }

  despedirEmpleado(empleado: any): void {
    Swal.fire({
      title: '⚠️ ¿Despedir empleado?',
      html: `Estás a punto de <b>despedir</b> a:<br><br>
             <i class="fas fa-user-times" style="font-size: 2rem; color: #dc2626; margin: 10px;"></i><br>
             <b>${empleado.nombre}</b><br>
             <small>${empleado.rol} - ${empleado.email}</small><br><br>
             Esta acción desactivará su cuenta permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, despedir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.editarEmpleado(empleado.id, { activo: false }).subscribe({
          next: () => {
            Swal.fire('Empleado despedido', `${empleado.nombre} ha sido desactivado del sistema.`, 'success');
            this.cargarDatosDelSistema();
          },
          error: (err) => Swal.fire('Error', 'No se pudo despedir al empleado', 'error')
        });
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
    } else if (tab === 'menu') {
      this.cargarProductos();
      this.cargarCategorias();
    } else if (tab === 'categorias') {
      this.cargarCategorias();
    } else if (tab === 'turnos') {
      this.cargarTurnos();
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
    
    // Si ya tiene sucursal preseleccionada, calcular el siguiente número
    if (sucursalId) {
      this.calcularSiguienteNumeroMesa(sucursalId);
    }
    
    this.mostrarModalMesa = true;
  }

  onCambioSucursalMesa(): void {
    if (this.mesaForm.sucursalId) {
      this.calcularSiguienteNumeroMesa(Number(this.mesaForm.sucursalId));
    }
  }

  onCambioTipoMesa(): void {
    // Asignar capacidad según el tipo de mesa
    switch (this.mesaForm.tipo) {
      case 'cuadrada':
        this.mesaForm.capacidad = 4;
        break;
      case 'rectangular':
        this.mesaForm.capacidad = 2;
        break;
      case 'circular':
        this.mesaForm.capacidad = 6;
        break;
      default:
        this.mesaForm.capacidad = 4;
    }
  }

  calcularSiguienteNumeroMesa(sucursalId: number): void {
    // Filtrar mesas de esa sucursal
    const mesasDeSucursal = this.mesas.filter(m => m.sucursalId === sucursalId);
    
    if (mesasDeSucursal.length === 0) {
      this.mesaForm.numero = 'M1';
      return;
    }

    // Extraer los números (M1 -> 1, M2 -> 2, etc.)
    const numeros = mesasDeSucursal
      .map(m => {
        const match = m.numero.match(/\d+/); // Extrae los dígitos
        return match ? parseInt(match[0]) : 0;
      })
      .filter(n => n > 0);

    // Encontrar el máximo número
    const maxNumero = Math.max(...numeros, 0);
    
    // Asignar el siguiente
    this.mesaForm.numero = `M${maxNumero + 1}`;
    console.log(`📍 Siguiente mesa para sucursal ${sucursalId}: ${this.mesaForm.numero}`);
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
    console.log('🪑 Datos del formulario de mesa:', this.mesaForm);
    console.log('🏢 Sucursales disponibles:', this.sucursales);
    console.log('✅ Sucursales activas:', this.sucursalesActivas);

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

  get mesasPorSucursalArray(): Array<{ nombre: string; mesas: any[] }> {
    const agrupadas: any = {};
    const mesasParaAgrupar = this.mesasFiltradas; // Usar mesas filtradas
    
    mesasParaAgrupar.forEach(mesa => {
      const sucursal = this.sucursales.find(s => s.id === mesa.sucursalId);
      const nombreSucursal = sucursal?.nombre || 'Sin sucursal';
      
      if (!agrupadas[nombreSucursal]) {
        agrupadas[nombreSucursal] = [];
      }
      agrupadas[nombreSucursal].push(mesa);
    });
    
    // Convertir objeto a array
    return Object.keys(agrupadas).map(nombre => ({
      nombre,
      mesas: agrupadas[nombre]
    }));
  }

  // ==========================================
  // ✅ GESTIÓN DE PRODUCTOS
  // ==========================================

  cargarProductos(): void {
    this.adminService.getProductos().subscribe({
      next: (data) => {
        this.productos = data;
        console.log('✅ Productos cargados:', this.productos.length);
      },
      error: (err) => console.error('❌ Error cargando productos:', err)
    });
  }

  abrirModalProducto(): void {
    this.esEdicionProducto = false;
    this.productoForm = {
      nombre: '',
      descripcion: '',
      precioBase: 0,
      categoriaId: null,
      destino: 'COCINA',
      activo: true
    };
    this.mostrarModalProducto = true;
  }

  editarProducto(producto: any): void {
    this.esEdicionProducto = true;
    this.productoForm = { ...producto };
    this.mostrarModalProducto = true;
  }

  cerrarModalProducto(): void {
    this.mostrarModalProducto = false;
  }

  guardarProducto(): void {
    if (!this.productoForm.nombre || !this.productoForm.precioBase) {
      Swal.fire('Error', 'Completa nombre y precio', 'error');
      return;
    }

    const datosProducto = {
      ...this.productoForm,
      empresaId: 1,
      precioBase: Number(this.productoForm.precioBase),
      categoriaId: this.productoForm.categoriaId ? Number(this.productoForm.categoriaId) : null
    };

    console.log('📤 Enviando producto al backend:', datosProducto);

    if (this.esEdicionProducto && this.productoForm.id) {
      this.adminService.editarProducto(this.productoForm.id, datosProducto).subscribe({
        next: () => {
          Swal.fire('¡Éxito!', 'Producto actualizado', 'success');
          this.cargarProductos();
          this.cerrarModalProducto();
        },
        error: (err) => Swal.fire('Error', err.error?.message || 'Error al actualizar', 'error')
      });
    } else {
      this.adminService.crearProducto(datosProducto).subscribe({
        next: () => {
          Swal.fire('¡Éxito!', 'Producto creado', 'success');
          this.cargarProductos();
          this.cerrarModalProducto();
        },
        error: (err) => Swal.fire('Error', err.error?.message || 'Error al crear', 'error')
      });
    }
  }

  toggleProducto(producto: any): void {
    this.adminService.editarProducto(producto.id, { activo: !producto.activo }).subscribe({
      next: () => {
        Swal.fire('¡Listo!', `Producto ${producto.activo ? 'desactivado' : 'activado'}`, 'success');
        this.cargarProductos();
      },
      error: (err) => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
    });
  }

  // ==========================================
  // ✅ GESTIÓN DE CATEGORÍAS
  // ==========================================

  cargarCategorias(): void {
    this.adminService.getCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        console.log('✅ Categorías cargadas:', this.categorias.length);
      },
      error: (err) => console.error('❌ Error cargando categorías:', err)
    });
  }

  abrirModalCategoria(): void {
    this.esEdicionCategoria = false;
    this.categoriaForm = {
      nombre: '',
      descripcion: '',
      iconoColor: '#3b82f6',
      activo: true
    };
    this.mostrarModalCategoria = true;
  }

  editarCategoria(categoria: any): void {
    this.esEdicionCategoria = true;
    this.categoriaForm = { ...categoria };
    this.mostrarModalCategoria = true;
  }

  cerrarModalCategoria(): void {
    this.mostrarModalCategoria = false;
  }

  guardarCategoria(): void {
    if (!this.categoriaForm.nombre) {
      Swal.fire('Error', 'El nombre es requerido', 'error');
      return;
    }

    const datosCategoria = {
      ...this.categoriaForm,
      empresaId: 1
    };

    if (this.esEdicionCategoria && this.categoriaForm.id) {
      this.adminService.editarCategoria(this.categoriaForm.id, datosCategoria).subscribe({
        next: () => {
          Swal.fire('¡Éxito!', 'Categoría actualizada', 'success');
          this.cargarCategorias();
          this.cerrarModalCategoria();
        },
        error: (err) => Swal.fire('Error', err.error?.message || 'Error al actualizar', 'error')
      });
    } else {
      this.adminService.crearCategoria(datosCategoria).subscribe({
        next: () => {
          Swal.fire('¡Éxito!', 'Categoría creada', 'success');
          this.cargarCategorias();
          this.cerrarModalCategoria();
        },
        error: (err) => Swal.fire('Error', err.error?.message || 'Error al crear', 'error')
      });
    }
  }

  toggleCategoria(categoria: any): void {
    this.adminService.editarCategoria(categoria.id, { activo: !categoria.activo }).subscribe({
      next: () => {
        Swal.fire('¡Listo!', `Categoría ${categoria.activo ? 'desactivada' : 'activada'}`, 'success');
        this.cargarCategorias();
      },
      error: (err) => Swal.fire('Error', 'No se pudo cambiar el estado', 'error')
    });
  }

  // ==========================================
  // ✅ GESTIÓN DE TURNOS
  // ==========================================

  cargarTurnos(): void {
    this.adminService.getTurnos().subscribe({
      next: (data) => {
        this.turnos = data;
        console.log('✅ Turnos cargados:', this.turnos.length);
      },
      error: (err) => console.error('❌ Error cargando turnos:', err)
    });
  }

  abrirModalTurno(): void {
    const hoy = new Date().toISOString().split('T')[0];
    this.turnoForm = {
      empleadoId: null,
      fecha: hoy,
      horaInicio: '09:00',
      horaFin: '17:00',
      notas: ''
    };
    this.mostrarModalTurno = true;
  }

  cerrarModalTurno(): void {
    this.mostrarModalTurno = false;
  }

  guardarTurno(): void {
    if (!this.turnoForm.empleadoId || !this.turnoForm.fecha) {
      Swal.fire('Error', 'Selecciona empleado y fecha', 'error');
      return;
    }

    this.adminService.crearTurno(this.turnoForm).subscribe({
      next: () => {
        Swal.fire('¡Éxito!', 'Turno asignado', 'success');
        this.cargarTurnos();
        this.cerrarModalTurno();
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'Error al crear turno', 'error')
    });
  }

  eliminarTurnoAdmin(turno: any): void {
    Swal.fire({
      title: '¿Eliminar turno?',
      text: `Turno del ${turno.fecha}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.eliminarTurno(turno.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'Turno eliminado', 'success');
            this.cargarTurnos();
          },
          error: (err) => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }
}