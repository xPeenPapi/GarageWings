// src/app/models/api-models.ts

// ==========================================
// ENUMS (Igual que en tu Prisma)
// ==========================================

export enum EstadoOrden {
  PENDIENTE = 'PENDIENTE',
  EN_PREPARACION = 'EN_PREPARACION',
  LISTA = 'LISTA',
  ENTREGADA = 'ENTREGADA',
  CERRADA = 'CERRADA',
  CANCELADA = 'CANCELADA'
}

export enum EstadoMesa {
  DISPONIBLE = 'DISPONIBLE',
  OCUPADA = 'OCUPADA',
  SUCIA = 'SUCIA'
}

export enum RolEmpleado {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_EMPRESA = 'ADMIN_EMPRESA',
  GERENTE = 'GERENTE',
  CAJA = 'CAJA',
  MESERO = 'MESERO',
  COCINA = 'COCINA',
  BARRA = 'BARRA'
}

// ==========================================
// INTERFACES (Tipos de datos)
// ==========================================

export interface Empresa {
  id: number;
  nombre: string;
  logoUrl?: string;
  activo: boolean;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activa: boolean;
}

export interface Empleado {
  id: number;
  nombre: string;
  email: string;
  rol: RolEmpleado;
  activo: boolean;
  // Opcionales dependiendo de si el backend los envía
  empresa?: Empresa;
  sucursal?: Sucursal;
}

export interface Mesa {
  id: number;
  numero: string;
  capacidad: number;
  estado: EstadoMesa;
  tipo: string; // 'cuadrada' | 'rectangular'
  posX: number;
  posY: number;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  iconoColor?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precioBase: number; // Decimal en BD -> number en TS
  imagenUrl?: string;
  destino: 'COCINA' | 'BARRA';
  categoria?: Categoria;
}

export interface ItemOrden {
  id: number;
  cantidad: number;
  precioUnitario: number; // Decimal en BD -> number en TS
  estado: EstadoOrden;
  notas?: string;
  opcionesElegidas?: any; // JSON
  
  // Relaciones (El backend debe hacer 'include: { producto: true }')
  producto?: Producto; 
  productoId: number;
}

// Esta es la interfaz principal que usará tu componente "Pagar"
export interface OrdenBackend {
  id: number;
  estado: EstadoOrden;
  comensales: number;
  total: number; // Decimal en BD -> number en TS
  notaGeneral?: string;
  creadaEn: string; // DateTime llega como string ISO
  cerradaEn?: string;

  // Relaciones (El backend debe hacer los 'include' correspondientes)
  mesa?: Mesa;
  mesero?: Empleado; // Prisma: 'mesero' es la relación con modelo Empleado
  items: ItemOrden[];
  pagos?: any[]; // Si necesitas mostrar historial de pagos
  
  // Propiedades Extra para el Frontend (No están en BD, pero las usamos en la UI)
  subcuentas?: any[]; 
}