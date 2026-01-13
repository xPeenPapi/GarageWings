import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('🔑 Token para request:', token ? `${token.substring(0, 20)}...` : 'NO HAY TOKEN');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // 1. Obtener todas las sucursales con sus métricas
  getSucursales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sucursales`, { headers: this.getHeaders() });
  }

  // 2. Obtener todo el personal de la empresa
  getAllPersonal(): Observable<any[]> {
    console.log('📞 Llamando a /personal/global...');
    return this.http.get<any[]>(`${this.apiUrl}/personal/global`, { headers: this.getHeaders() });
  }

  // 3. Obtener reporte financiero global (si tienes el endpoint, si no, lo calculamos en el front)
  getReporteGlobal(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/admin/global`, { headers: this.getHeaders() });
  }

  crearSucursal(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sucursales`, datos, { 
      headers: this.getHeaders() 
    });
  }

  // 2. Crear Empleado (Gerente, Mesero, etc.) desde Admin
  crearEmpleado(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/personal`, datos, { 
      headers: this.getHeaders() 
    });
  }

  // Editar Empleado
  editarEmpleado(id: number, datos: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/personal/${id}`, datos, { 
      headers: this.getHeaders() 
    });
  }


  editarSucursal(id: number, datos: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/sucursales/${id}`, datos, { 
      headers: this.getHeaders() 
    });
  }

  // Eliminar Sucursal
  eliminarSucursal(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sucursales/${id}`, { 
      headers: this.getHeaders() 
    });
  }

  // ==========================================
  // ✅ NUEVOS MÉTODOS PARA GESTIÓN COMPLETA
  // ==========================================

  // Productos
  getProductos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/productos`, { headers: this.getHeaders() });
  }

  crearProducto(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/productos`, datos, { headers: this.getHeaders() });
  }

  editarProducto(id: number, datos: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/productos/${id}`, datos, { headers: this.getHeaders() });
  }

  eliminarProducto(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/productos/${id}`, { headers: this.getHeaders() });
  }

  // Categorías
  getCategorias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categorias`, { headers: this.getHeaders() });
  }

  crearCategoria(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/categorias`, datos, { headers: this.getHeaders() });
  }

  editarCategoria(id: number, datos: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/categorias/${id}`, datos, { headers: this.getHeaders() });
  }

  eliminarCategoria(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categorias/${id}`, { headers: this.getHeaders() });
  }

  // Turnos
  getTurnos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/turnos`, { headers: this.getHeaders() });
  }

  crearTurno(datos: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/turnos`, datos, { headers: this.getHeaders() });
  }

  eliminarTurno(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/turnos/${id}`, { headers: this.getHeaders() });
  }

  // ✅ REPORTES
  getReporteDia(fecha: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/reportes/gerente?fecha=${fecha}`, { headers: this.getHeaders() });
  }
}
