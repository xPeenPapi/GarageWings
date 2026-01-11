import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// ==========================================
// 1. INTERFACES
// ==========================================

export interface DashboardData {
  ventasTotales: number;
  ordenesTotales: number;
  personalActivo: number;
  ticketPromedio: number;
  resumenPago: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
  };
  totalGeneral: number;
}

// INTERFAZ SUCURSAL
export interface Sucursal {
  id?: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
}

export interface Empleado {
  id?: number;
  nombre: string;
  email: string;
  password?: string;
  rol: 'MESERO' | 'COCINA' | 'CAJA' | 'GERENTE' | 'BARRA';
  fechaContratacion?: string;
  activo?: boolean;
  // Campo para asignar ubicación
  sucursalId?: number | null; 
}

export interface Turno {
  id?: number;
  empleadoId: number;
  empleadoNombre?: string; 
  empleadoRol?: string;    
  fecha: string;           
  horaInicio: string;      
  horaFin: string;         
  notas?: string;
  // Campo para saber dónde es el turno
  sucursalId?: number;     
}

// ==========================================
// 2. SERVICIO
// ==========================================

@Injectable({
  providedIn: 'root'
})
export class GerenteService {
  
  // Apuntamos a la raíz de la API
  private baseUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) {}

  // Helper para enviar el Token de sesión
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ==========================================
  // A) MÉTODOS DE DASHBOARD (Reportes)
  // ==========================================

  // 👇 ACTUALIZADO: Ahora acepta fecha opcional (string 'YYYY-MM-DD')
  getDashboardData(fecha?: string): Observable<DashboardData> {
    let url = `${this.baseUrl}/reportes/gerente`;
    
    // Si nos mandan una fecha, la agregamos a la URL como Query Param
    if (fecha) {
      url += `?fecha=${fecha}`;
    }

    return this.http.get<DashboardData>(url, { 
      headers: this.getHeaders() 
    });
  }

  // ==========================================
  // B) MÉTODOS DE GESTIÓN DE PERSONAL (RRHH)
  // ==========================================

  getEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.baseUrl}/personal`, { 
      headers: this.getHeaders() 
    });
  }

  crearEmpleado(empleado: Empleado): Observable<Empleado> {
    return this.http.post<Empleado>(`${this.baseUrl}/personal`, empleado, { 
      headers: this.getHeaders() 
    });
  }

  editarEmpleado(id: number, empleado: Empleado): Observable<Empleado> {
    return this.http.put<Empleado>(`${this.baseUrl}/personal/${id}`, empleado, { 
      headers: this.getHeaders() 
    });
  }

  eliminarEmpleado(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/personal/${id}`, { 
      headers: this.getHeaders() 
    });
  }

  // ==========================================
  // C) MÉTODOS DE TURNOS
  // ==========================================

  getTurnos(): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.baseUrl}/turnos`, { 
      headers: this.getHeaders() 
    });
  }

  crearTurno(turno: Turno): Observable<Turno> {
    return this.http.post<Turno>(`${this.baseUrl}/turnos`, turno, { 
      headers: this.getHeaders() 
    });
  }

  eliminarTurno(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/turnos/${id}`, { 
      headers: this.getHeaders() 
    });
  }

  // ==========================================
  // D) MÉTODOS DE SUCURSALES
  // ==========================================

  getSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${this.baseUrl}/sucursales`, { 
      headers: this.getHeaders() 
    });
  }

  crearSucursal(sucursal: Sucursal): Observable<Sucursal> {
    return this.http.post<Sucursal>(`${this.baseUrl}/sucursales`, sucursal, { 
      headers: this.getHeaders() 
    });
  }
}