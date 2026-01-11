import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environments';


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
  imagenUrl?: string; // ✅ NUEVO: Para que Angular reconozca la imagen
  elementos?: number; // Este lo llenaremos manualmente con el map
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
  cantidad?: number;
  notas?: string;
  opcionesElegidas?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  
  private apiUrl = `${environment.apiUrl}/api`; // ✅ ACTUALIZADO

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/productos`, { headers: this.getHeaders() });
  }

  // ✅ MODIFICADO: Transformamos la respuesta para arreglar el conteo y la imagen
  getCategorias(): Observable<Categoria[]> {
    return this.http.get<any[]>(`${this.apiUrl}/productos/categorias`, { headers: this.getHeaders() }).pipe(
      map(respuesta => {
        return respuesta.map(cat => ({
          id: cat.id,
          nombre: cat.nombre,
          descripcion: cat.descripcion,
          iconoColor: cat.iconoColor,
          imagenUrl: cat.imagenUrl, // Mapeamos la imagen nueva
          
          // 🔥 AQUÍ ARREGLAMOS EL "0 ELEMENTOS":
          // Si el backend manda "_count", usamos eso. Si no, 0.
          elementos: cat._count ? cat._count.productos : 0,          
          productos: cat.productos
        }));
      })
    );
  }

  // ✅ Obtener adicionales
  getAdicionales(): Observable<Producto[]> {
    return this.http.get<any[]>(`${this.apiUrl}/productos/adicionales`, { headers: this.getHeaders() }).pipe(
      map(adicionales => adicionales.map(a => ({
        ...a,
        precio: a.precioBase,
        cantidad: 0
      })))
    );
  }
}