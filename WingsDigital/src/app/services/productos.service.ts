import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// ✅ INTERFACES NECESARIAS (Sin esto, AggPedidoComponent da error)
export interface OpcionPersonalizacion {
  titulo: string;
  tipo: 'radio' | 'checkbox';
  obligatorio: boolean;
  opciones: { nombre: string; precio: number }[];
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  iconoColor?: string;
  elementos?: number;
  productos?: any[];
}

export interface Producto {
  id: number;
  nombre: string;
  precioBase: number;
  precio?: number;
  descripcion?: string;
  imagenUrl?: string;
  categoriaId: number;
  destino: 'COCINA' | 'BARRA';
  configuracion?: OpcionPersonalizacion[];
  
  // Auxiliares para frontend
  cantidad?: number;
  notas?: string;
  opcionesElegidas?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  
  private apiUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Obtener productos
  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`, { headers: this.getHeaders() });
  }

  // Obtener categorías
  getCategorias(): Observable<Categoria[]> {
    // Si tu backend usa una ruta simple, prueba esta:
    // return this.http.get<Categoria[]>(`${this.apiUrl}/categorias`, { headers: this.getHeaders() });
    
    // Si tu backend usa estructura anidada, usa esta:
    return this.http.get<Categoria[]>(`${this.apiUrl}/productos/categorias`, { headers: this.getHeaders() });
  }
}