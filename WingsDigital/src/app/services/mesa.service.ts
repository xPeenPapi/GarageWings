import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';


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
  // Propiedades opcionales para la lógica visual
  mesaPadreId?: number | null;
  meseroId?: number | null;
  meseroNombre?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MesaService {
  // ⚠️ Asegúrate de que esta URL coincida con tu backend
  private apiUrl = `${environment.apiUrl}/mesas`; // ✅ ACTUALIZADO

  constructor(private http: HttpClient) {}

  // Helper para obtener el token (Autorización)
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Obtener todas las mesas
  getMesas(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Actualizar estado (Ocupar, Liberar, Unir)
  actualizarEstadoMesa(id: number, estado: string, mesero?: string): Observable<Mesa> {
    return this.http.patch<Mesa>(
      `${this.apiUrl}/${id}/estado`, 
      { estado, mesero },
      { headers: this.getHeaders() }
    );
  }

  // ✅ NUEVO MÉTODO: Transferir cuenta de una mesa a otra
  transferirMesa(origenId: number, destinoId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/transferir`, 
      { origenId, destinoId },
      { headers: this.getHeaders() }
    );
  }
}