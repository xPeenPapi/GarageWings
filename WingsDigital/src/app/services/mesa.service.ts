// mesa.service.ts - VERSIÓN CORREGIDA (No sobrescribe horaApertura)

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Mesa {
  id: number;
  numero: string;
  estado: string;
  capacidad: number;
  tipo?: string;
  tiempo?: string;
  mesero?: string;
  meseroId?: number | null;
  meseroNombre?: string | null;
  horaApertura?: string | null; // ✅ Campo para timestamp
  posX?: number;
  posY?: number;
  mesaPadreId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class MesaService {
  private apiUrl = `${environment.apiUrl}/mesas`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getMesas(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  /**
   * ✅ MÉTODO CORREGIDO: Solo crea horaApertura si se está abriendo la mesa
   * @param mantenerHoraApertura - Si true, NO sobrescribe horaApertura (para reentradas)
   */
  actualizarEstadoMesa(
    id: number, 
    estado: string, 
    mesero: string,
    mantenerHoraApertura: boolean = false // ✅ NUEVO parámetro opcional
  ): Observable<Mesa> {
    const body: any = { estado };
    
    // Si se está ocupando la mesa
    if (estado === 'ocupada') {
      body.mesero = mesero;
      
      // ✅ SOLO crear timestamp si NO queremos mantener el existente
      if (!mantenerHoraApertura) {
        body.horaApertura = new Date().toISOString();
        console.log(`✅ Abriendo mesa ${id} - Nuevo timestamp: ${body.horaApertura}`);
      } else {
        console.log(`ℹ️ Reentrada a mesa ${id} - Manteniendo horaApertura existente`);
      }
    }
    
    // Si se está liberando la mesa
    if (estado === 'disponible') {
      body.mesero = ''; // ✅ Limpiar mesero
      body.horaApertura = null; // ✅ Limpiar timestamp
      console.log(`🧹 Liberando mesa ${id}`);
    }
    
    return this.http.patch<Mesa>(
      `${this.apiUrl}/${id}/estado`, 
      body,
      { headers: this.getHeaders() }
    );
  }

  transferirMesa(origenId: number, destinoId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/transferir`, 
      { origenId, destinoId },
      { headers: this.getHeaders() }
    );
  }
}