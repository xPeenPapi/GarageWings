import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Mesa {
  id: number;
  numero: string;
  estado: string; // 'disponible' | 'ocupada' | 'sucia' | 'reservada'
  capacidad: number;
  tipo?: string;  // 'cuadrada' | 'rectangular'
  tiempo?: string;
  mesero?: string;
  posX?: number;
  posY?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MesaService {
  // ⚠️ CORRECCIÓN IMPORTANTE: Agregamos '/api' para coincidir con el backend
  private apiUrl = 'http://localhost:3000/api/mesas'; 

  constructor(private http: HttpClient) {}

  // Helper para obtener el token (si tu backend pide auth)
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getMesas(): Observable<Mesa[]> {
    // Enviamos headers por si el backend protege la ruta
    return this.http.get<Mesa[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  actualizarEstadoMesa(id: number, estado: string, mesero?: string): Observable<Mesa> {
    return this.http.patch<Mesa>(
      `${this.apiUrl}/${id}/estado`, 
      { estado, mesero },
      { headers: this.getHeaders() }
    );
  }
}