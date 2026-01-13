import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ===================================================
// INTERFACES
// ===================================================

export interface OpcionPersonalizacion {
  titulo: string;
  tipo: 'radio' | 'checkbox';
  obligatorio: boolean;
  opciones: { nombre: string; precio: number }[];
}

export interface Categoria {
  id: number;
  nombre: string;
  activo: boolean; // ✅ Control de visibilidad para el Gerente
  descripcion?: string;
  iconoColor?: string;
  imagenUrl?: string; 
  elementos?: number; 
  productos?: Producto[];
}

export interface Producto {
  id: number;
  nombre: string;
  precioBase: number;
  activo: boolean; // ✅ Control de visibilidad para el Gerente
  precio?: number; // Precio calculado (base + extras)
  descripcion?: string;
  imagenUrl?: string;
  categoriaId: number;
  destino: 'COCINA' | 'BARRA';
  configuracion?: OpcionPersonalizacion[];
  cantidad?: number;
  notas?: string;
  opcionesElegidas?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  
  // URLs base extraídas del environment
  private baseUrl = environment.apiUrl;
  private prodUrl = `${environment.apiUrl}/productos`;
  private catUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ===================================================
  // MÉTODOS DE PRODUCTOS
  // ===================================================

  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.prodUrl, { headers: this.getHeaders() }).pipe(
      map(prods => prods.map(p => ({
        ...p,
        // Si el backend no envía 'activo', por defecto es true
        activo: p.activo !== undefined ? p.activo : true 
      })))
    );
  }

  getProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.prodUrl}/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Actualiza un producto (Usado por el Gerente para activar/desactivar)
   */
  updateProducto(id: number, data: Partial<Producto>): Observable<Producto> {
    return this.http.patch<Producto>(`${this.prodUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  // ===================================================
  // MÉTODOS DE CATEGORÍAS
  // ===================================================

  /**
   * Obtiene categorías y transforma la respuesta para normalizar el conteo e 'activo'
   */
  getCategorias(): Observable<Categoria[]> {
    return this.http.get<any[]>(this.catUrl, { headers: this.getHeaders() }).pipe(
      map(data => data.map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        descripcion: cat.descripcion || '',
        iconoColor: cat.iconoColor || '#3498db',
        imagenUrl: cat.imagenUrl || '',
        // Resuelve error TS2322 garantizando el booleano
        activo: cat.activo !== undefined ? cat.activo : true, 
        // Calcula elementos desde el conteo de Prisma o el largo del array
        elementos: cat._count?.productos ?? (cat.productos ? cat.productos.length : 0),
        productos: cat.productos || []
      })))
    );
  }

  /**
   * Actualiza una categoría (Usado por el Gerente para activar/desactivar)
   */
  updateCategoria(id: number, data: Partial<Categoria>): Observable<Categoria> {
    return this.http.patch<Categoria>(`${this.catUrl}/${id}`, data, { headers: this.getHeaders() });
  }

  // ===================================================
  // MÉTODOS COMPLEMENTARIOS
  // ===================================================

  /**
   * Obtiene productos de la categoría especial "Adicionales"
   */
  getAdicionales(): Observable<Producto[]> {
    return this.http.get<any[]>(`${this.prodUrl}/adicionales`, { headers: this.getHeaders() }).pipe(
      map(adicionales => adicionales.map(a => ({
        ...a,
        precio: a.precioBase,
        cantidad: 1, // Por defecto al agregar adicionales
        activo: a.activo !== undefined ? a.activo : true
      })))
    );
  }
}