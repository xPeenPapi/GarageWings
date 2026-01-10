import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
// ✅ IMPORTAR EL SERVICIO NUEVO
import { GerenteService, DashboardData } from '../../services/gerente.service';

interface ResumenDia {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
}

interface PersonalRol {
  meseros: number;
  cocineros: number;
  cajeros: number;
  baristas: number;
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
  imports: [CommonModule],
  templateUrl: './gerente-dashboard.component.html',
  styleUrls: ['./gerente-dashboard.component.css']
})
export class GerenteDashboardComponent implements OnInit {
  
  // Datos del usuario
  public nombreGerente: string = '';
  public sucursalNombre: string = 'Garage Sushis Centro';
  public horaActual: string = '';
  public cargando: boolean = true; // ✅ Para mostrar un spinner si quieres

  // Pestañas
  public tabActiva: 'resumen' | 'personal' | 'turnos' = 'resumen';

  // Resumen del día (Se llenará con la BD)
  public resumenDia: ResumenDia = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0
  };

  public totalGeneral: number = 0;

  // Estadísticas (Se llenará con la BD)
  public estadisticas: EstadisticaDia = {
    ventasTotales: 0,
    ordenesTotales: 0,
    personalActivo: 0,
    ticketPromedio: 0
  };

  // Personal por rol (Nota: El backend actual envía el total, 
  // para el desglose específico necesitaríamos ajustar el endpoint después.
  // Por ahora lo dejamos estático o en 0).
  public personalPorRol: PersonalRol = {
    meseros: 0,
    cocineros: 0,
    cajeros: 0,
    baristas: 0
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private gerenteService: GerenteService // ✅ INYECCIÓN DEL SERVICIO
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.actualizarHora();
    
    // ✅ LLAMADA A LA BASE DE DATOS
    this.cargarDatosDashboard();

    // Actualizar hora cada minuto
    setInterval(() => {
      this.actualizarHora();
    }, 60000);

    // Opcional: Actualizar datos cada 30 segundos automáticamente
    // setInterval(() => this.cargarDatosDashboard(), 30000);
  }

  cargarDatosUsuario(): void {
    const user = this.authService.currentUser;
    if (user) {
      this.nombreGerente = user.nombre;
    }
  }

  actualizarHora(): void {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  // ✅ MÉTODO PRINCIPAL DE CARGA DE DATOS REALES
  cargarDatosDashboard(): void {
    this.cargando = true;
    
    this.gerenteService.getDashboardData().subscribe({
      next: (data: DashboardData) => {
        // 1. Mapear Resumen Financiero
        this.resumenDia = {
          efectivo: data.resumenPago.efectivo,
          tarjeta: data.resumenPago.tarjeta,
          transferencia: data.resumenPago.transferencia
        };

        this.totalGeneral = data.totalGeneral;

        // 2. Mapear KPIs / Estadísticas
        this.estadisticas = {
          ventasTotales: data.ventasTotales,
          ordenesTotales: data.ordenesTotales,
          personalActivo: data.personalActivo,
          ticketPromedio: data.ticketPromedio
        };

        this.cargando = false;
        console.log('✅ Datos de gerente actualizados');
      },
      error: (error) => {
        console.error('❌ Error al obtener datos del dashboard:', error);
        this.cargando = false;
      }
    });
  }

  cambiarTab(tab: 'resumen' | 'personal' | 'turnos'): void {
    this.tabActiva = tab;
  }

  cerrarSesion(): void {
    this.authService.logout();
  }

  // Navegación
  irAPersonal(): void {
    this.router.navigate(['/gerente/personal']);
  }

  irAReportes(): void {
    this.router.navigate(['/gerente/reportes']);
  }

  irAInventario(): void {
    this.router.navigate(['/gerente/inventario']);
  }

  irAConfiguracion(): void {
    this.router.navigate(['/gerente/configuracion']);
  }
}