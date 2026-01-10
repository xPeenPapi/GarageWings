import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// 1. Definimos la interfaz para que Angular sepa qué datos vienen
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

@Injectable({
  providedIn: 'root'
})
export class GerenteService {
  
  // Asegúrate de que esta URL coincida con tu backend
  private apiUrl = 'http://localhost:3000/api/reportes'; 

  constructor(private http: HttpClient) {}

  // Helper para enviar el Token de sesión (si usas autenticación)
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // 2. Método para obtener los datos del Dashboard
  getDashboardData(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/gerente`, { 
      headers: this.getHeaders() 
    });
  }
}