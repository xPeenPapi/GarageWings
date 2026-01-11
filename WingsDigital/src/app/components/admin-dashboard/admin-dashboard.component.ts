import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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

interface ResumenGeneral {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  total: number;
}

interface EstadisticaGeneral {
  ventasTotales: number;
  ordenesDelDia: number;
  personalActivo: number;
  sucursalesActivas: number;
}

interface PersonalRol {
  meseros: number;
  gerentes: number;
  cocineros: number;
  baristas: number;
  cajeros: number;
}

interface EstadoPersonal {
  activo: number;
  vacaciones: number;
  inactivo: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {

  // Usuario
  public nombreAdmin: string = 'hola';
  public horaActual: string = '';

  // Sucursal seleccionada
  public sucursalSeleccionada: string = 'todas';

  // Tabs
  public tabActiva: 'resumen' | 'sucursales' | 'personal' | 'menu' | 'categorias' | 'turnos' = 'resumen';

  // Estadísticas generales
  public estadisticas: EstadisticaGeneral = {
    ventasTotales: 4341.25,
    ordenesDelDia: 77,
    personalActivo: 6,
    sucursalesActivas: 2
  };

  // Resumen general
  public resumenGeneral: ResumenGeneral = {
    efectivo: 350.25,
    tarjeta: 650.00,
    transferencia: 250.25,
    total: 4341.25
  };

  // Sucursales
  public sucursales: Sucursal[] = [
    {
      id: 1,
      nombre: 'Garage Sushis Centro',
      empleadosActivos: 8,
      horaPico: '20:00',
      ventas: 2450.50,
      ordenes: 45,
      ticketPromedio: 54.46,
      activa: true
    },
    {
      id: 2,
      nombre: 'Garage Sushis Norte',
      empleadosActivos: 6,
      horaPico: '19:30',
      ventas: 1890.75,
      ordenes: 32,
      ticketPromedio: 59.09,
      activa: true
    },
    {
      id: 3,
      nombre: 'Garage Sushis Sur',
      empleadosActivos: 0,
      horaPico: '--:--',
      ventas: 0,
      ordenes: 0,
      ticketPromedio: 0,
      activa: false
    }
  ];

  // Personal por rol
  public personalPorRol: PersonalRol = {
    meseros: 2,
    gerentes: 1,
    cocineros: 2,
    baristas: 1,
    cajeros: 1
  };

  // Estado del personal
  public estadoPersonal: EstadoPersonal = {
    activo: 6,
    vacaciones: 1,
    inactivo: 0
  };

  // Platillos
  public platillos: number = 7;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.actualizarHora();

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
    this.horaActual = ahora.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Filtros
  seleccionarSucursal(sucursal: string): void {
    this.sucursalSeleccionada = sucursal;
    // Aquí cargarías los datos filtrados por sucursal
  }

  // Tabs
  cambiarTab(tab: 'resumen' | 'sucursales' | 'personal' | 'menu' | 'categorias' | 'turnos'): void {
    this.tabActiva = tab;
  }

  // Navegación
  cerrarSesion(): void {
    this.authService.logout();
  }

  // Cálculos
  get ventasPorSucursalData(): { sucursal: string; ventas: number }[] {
    return this.sucursales
      .filter(s => s.activa)
      .map(s => ({
        sucursal: s.nombre,
        ventas: s.ventas
      }));
  }

  get maxVentas(): number {
    return Math.max(...this.sucursales.filter(s => s.activa).map(s => s.ventas));
  }

  calcularPorcentaje(valor: number, total: number): number {
    return total > 0 ? (valor / total) * 100 : 0;
  }
}