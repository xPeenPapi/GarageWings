import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DestinoProducto } from '@prisma/client';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const productos = await this.prisma.producto.findMany({
      include: { categoria: true }
    });
    console.log('📊 Productos encontrados:', productos.length);
    return productos;
  }

  // ✅ MODIFICADO: Agregamos _count para arreglar el "0 elementos"
async findAllCategorias() {
    console.log("🔍 Buscando categorías..."); // Log de inicio

    const categorias = await this.prisma.categoria.findMany({
      include: { 
        // 1. Traer productos (Le quité el filtro 'disponible' temporalmente para probar)
        productos: {
            select: { id: true, nombre: true } // Solo traemos lo básico para no saturar
        },
        // 2. CONTADOR
        _count: {
          select: { productos: true }
        }
      }
    });

    // 🚨 ESTO ES LO IMPORTANTE:
    // Mira tu terminal del servidor (pantalla negra) cuando recargues la página.
    // Deberías ver algo como: "Categoria: Bar, Conteo: 4"
    categorias.forEach(cat => {
        console.log(`📊 Categoría: ${cat.nombre} | Productos encontrados (Array): ${cat.productos.length} | Contador Prisma (_count): ${cat._count?.productos}`);
    });

    return categorias;
  }

  async findByCategoria(categoriaId: number) {
    const productos = await this.prisma.producto.findMany({
      where: { categoriaId: categoriaId },
      include: { categoria: true }
    });
    return productos;
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true }
    });

    if (!producto) throw new NotFoundException(`Producto #${id} no encontrado`);
    return producto;
  }

  async create(data: any) {
    console.log('📦 Datos recibidos para crear producto:', data);
    
    return this.prisma.producto.create({
      data: {
        nombre: data.nombre,
        precioBase: Number(data.precioBase || data.precio || 0),
        descripcion: data.descripcion || '',
        imagenUrl: data.imagenUrl || null,
        destino: data.destino || DestinoProducto.COCINA,
        empresaId: Number(data.empresaId || 1), 
        categoriaId: data.categoriaId ? Number(data.categoriaId) : null,
        configuracion: data.configuracion || undefined,
        activo: data.activo !== undefined ? data.activo : true
      }
    });
  }

  // ✅ Obtener adicionales
  async getAdicionales() {
    const categoria = await this.prisma.categoria.findFirst({
      where: { nombre: 'Adicionales' }
    });
    
    if (!categoria) {
      return [];
    }
    
    return this.prisma.producto.findMany({
      where: { 
        categoriaId: categoria.id
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precioBase: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });
  }

async update(id: number, data: any) {
  return this.prisma.producto.update({
    where: { id },
    data: data // Aquí llegará { activo: false }
  });
}
}