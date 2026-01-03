import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DestinoProducto } from '@prisma/client';

@Injectable()
export class ProductosService {
  constructor(private prisma: PrismaService) {}

  // 1. Obtener todos los productos (General)
  async findAll() {
    return this.prisma.producto.findMany({
      include: { categoria: true }
    });
  }

  // 2. Obtener todas las categorías (Para el menú lateral)
  // ✅ CORREGIDO: Renombrado de 'findAllCategories' a 'findAllCategorias'
  async findAllCategorias() {
    return this.prisma.categoria.findMany({
      include: { 
        // Incluimos productos para saber cuántos elementos tiene cada cat
        productos: {
          where: { disponibilidad: { some: { disponible: true } } } 
        } 
      }
    });
  }

  // 3. Obtener productos de una categoría específica
  // ✅ CORREGIDO: Agregado este método que faltaba
  async findByCategoria(categoriaId: number) {
    const productos = await this.prisma.producto.findMany({
      where: { categoriaId: categoriaId },
      include: { categoria: true }
    });
    return productos;
  }

  // 4. Obtener un producto individual
  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true }
    });

    if (!producto) throw new NotFoundException(`Producto #${id} no encontrado`);
    return producto;
  }

  // 5. Crear producto
  async create(data: any) {
    return this.prisma.producto.create({
      data: {
        nombre: data.nombre,
        precioBase: data.precio,
        descripcion: data.descripcion,
        imagenUrl: data.imagenUrl,
        destino: data.destino || DestinoProducto.COCINA,
        empresaId: data.empresaId, 
        categoriaId: data.categoriaId,
        configuracion: data.configuracion || undefined
      }
    });
  }
}