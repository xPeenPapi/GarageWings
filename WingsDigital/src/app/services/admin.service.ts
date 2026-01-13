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
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // 1. Obtener todas las sucursales con sus métricas
  getSucursales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sucursales`, { headers: this.getHeaders() });
  }

  // 2. Obtener todo el personal de la empresa
  getAllPersonal(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/personal/global`, { headers: this.getHeaders() });
  }

  // 3. Obtener reporte financiero global (si tienes el endpoint, si no, lo calculamos en el front)
  getReporteGlobal(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reportes/admin/global`, { headers: this.getHeaders() });
  }
}