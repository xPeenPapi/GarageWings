import { PrismaClient, RolEmpleado, EstadoMesa, DestinoProducto } from '@prisma/client';

const prisma = new PrismaClient();

// LISTA DE PRODUCTOS (INCLUYE ADICIONALES)
const productosData = [
    { nombre: 'Cerveza Corona', descripcion: '355ml', precio: 45.00, categoria: 'Bar' },
    { nombre: 'Cerveza Tecate', descripcion: '355ml', precio: 45.00, categoria: 'Bar' },
    { nombre: 'Margaritas', descripcion: 'Clásica de limón', precio: 120.00, categoria: 'Bar' },
    { nombre: 'Mezcales', descripcion: 'Derecho con naranja', precio: 110.00, categoria: 'Bar' },
    // Bebidas
    { nombre: 'Té Chino (Refil)', descripcion: 'Té de jazmín', precio: 40.00, categoria: 'Bebidas' },
    { nombre: 'Coca Cola', descripcion: '600ml', precio: 35.00, categoria: 'Bebidas' },
    { nombre: 'Coca Light', descripcion: '600ml', precio: 35.00, categoria: 'Bebidas' },
    { nombre: 'Limonada Natural', descripcion: '', precio: 50.00, categoria: 'Bebidas' },
    { nombre: 'Limonada Pitufo', descripcion: 'Con curaçao azul', precio: 65.00, categoria: 'Bebidas' },
    { nombre: 'Limonada Mineral', descripcion: '', precio: 55.00, categoria: 'Bebidas' },
    { nombre: 'Limonada Cherry', descripcion: '', precio: 65.00, categoria: 'Bebidas' },
    // Hamburguesas
    { nombre: 'Chesse Burger', descripcion: 'Queso americano y vegetales', precio: 160.00, categoria: 'Hamburguesas' },
    { nombre: 'Little Baby Burger', descripcion: 'Versión pequeña de la clásica', precio: 120.00, categoria: 'Hamburguesas' },
    { nombre: 'Snack Burger', descripcion: 'Sencilla con queso', precio: 110.00, categoria: 'Hamburguesas' },
    { nombre: 'Cow Boy', descripcion: 'Con aros de cebolla y BBQ', precio: 195.00, categoria: 'Hamburguesas' },
    { nombre: 'Mario Especial', descripcion: 'La especialidad de la casa', precio: 220.00, categoria: 'Hamburguesas' },
    { nombre: 'Porky Burger', descripcion: 'Con pulled pork', precio: 210.00, categoria: 'Hamburguesas' },
    { nombre: 'Garage Mushroom', descripcion: 'Con champiñones salteados', precio: 185.00, categoria: 'Hamburguesas' },
    { nombre: 'Social Burger', descripcion: 'Doble carne, doble queso', precio: 250.00, categoria: 'Hamburguesas' },
    { nombre: 'Cruji Burger', descripcion: 'Pollo crujiente', precio: 175.00, categoria: 'Hamburguesas' },
    { nombre: 'Boneless Burger', descripcion: 'Trozos de boneless en la hamburguesa', precio: 190.00, categoria: 'Hamburguesas' },
    // Sushis Naturales
    { nombre: 'Avocado Roll', descripcion: 'Aguacate por fuera', precio: 160.00, categoria: 'Sushis Naturales' },
    { nombre: 'California', descripcion: 'Cangrejo, pepino y aguacate', precio: 130.00, categoria: 'Sushis Naturales' },
    { nombre: 'Paraiso Roll', descripcion: 'Frutas tropicales y salmón', precio: 180.00, categoria: 'Sushis Naturales' },
    { nombre: 'Salmon On Free', descripcion: 'Salmón fresco por fuera', precio: 195.00, categoria: 'Sushis Naturales' },
    { nombre: 'Salmon Roll', descripcion: 'Con salmón por dentro y fuera', precio: 185.00, categoria: 'Sushis Naturales' },
    { nombre: 'Tuna Roll', descripcion: 'Atún fresco', precio: 175.00, categoria: 'Sushis Naturales' },
    // Sushis Horneados
    { nombre: 'Camaron Crunchy Roll', descripcion: 'Camarón empanizado, horneado', precio: 190.00, categoria: 'Sushis Horneados' },
    { nombre: 'Garage Roll', descripcion: 'La especialidad horneada', precio: 230.00, categoria: 'Sushis Horneados' },
    { nombre: 'Tapa Arterias', descripcion: 'Con tocino, res y gratinado', precio: 240.00, categoria: 'Sushis Horneados' },
    { nombre: 'Erupcion', descripcion: 'Tampico picante encima', precio: 210.00, categoria: 'Sushis Horneados' },
    // Paquetes
    { nombre: 'Combo Gordito', descripcion: 'Hamburguesa, papas y bebida', precio: 250.00, categoria: 'Paquetes' },
    { nombre: 'Charola Sushi', descripcion: 'Selección de 3 rollos', precio: 450.00, categoria: 'Paquetes' },
    // Orientales
    { nombre: 'Yakimeshi', descripcion: 'Arroz frito con verduras', precio: 130.00, categoria: 'Orientales' },
    { nombre: 'Teriyaki', descripcion: 'Pollo en salsa teriyaki con arroz', precio: 170.00, categoria: 'Orientales' },
    { nombre: 'Gohan Especial Frito de Pollo', descripcion: 'Base de arroz, pollo frito', precio: 165.00, categoria: 'Orientales' },
    { nombre: 'Gohan Especial Frito de Camaron', descripcion: 'Base de arroz, camarón frito', precio: 185.00, categoria: 'Orientales' },
    { nombre: 'Gohan Especial Frito Mixto', descripcion: 'Pollo, res y camarón', precio: 195.00, categoria: 'Orientales' },
    { nombre: 'Dumplings', descripcion: '5 piezas al vapor', precio: 110.00, categoria: 'Orientales' },
    { nombre: 'Tuna Thai', descripcion: 'Atún sellado con salsa thai', precio: 220.00, categoria: 'Orientales' },
    { nombre: 'Camarones Rocka', descripcion: 'Camarones fritos en aderezo picante', precio: 190.00, categoria: 'Orientales' },
    // Entradas
    { nombre: 'Wings Garage', descripcion: '8 piezas, salsa a elegir', precio: 160.00, categoria: 'Entradas' },
    { nombre: 'Dedos de Queso', descripcion: '6 piezas con salsa italiana', precio: 120.00, categoria: 'Entradas' },
    { nombre: 'Harumaki de Cangrejo', descripcion: 'Rollitos primavera de cangrejo', precio: 115.00, categoria: 'Entradas' },
    { nombre: 'Papas Sazonadas', descripcion: 'Gajos de papa con especias', precio: 90.00, categoria: 'Entradas' },
    { nombre: 'Papas a la Francesa', descripcion: '', precio: 80.00, categoria: 'Entradas' },
    { nombre: 'Boneless', descripcion: '200g, salsa a elegir', precio: 150.00, categoria: 'Entradas' },
    // ✅ ADICIONALES
    { nombre: 'Aderezo Ranch', descripcion: 'Porción extra', precio: 15.00, categoria: 'Adicionales' },
    { nombre: 'Aderezo Blue Cheese', descripcion: 'Porción extra', precio: 15.00, categoria: 'Adicionales' },
    { nombre: 'Salsa BBQ', descripcion: 'Porción extra', precio: 10.00, categoria: 'Adicionales' },
    { nombre: 'Salsa Buffalo', descripcion: 'Porción extra', precio: 10.00, categoria: 'Adicionales' },
    { nombre: 'Papas Fritas Extra', descripcion: 'Porción adicional', precio: 30.00, categoria: 'Adicionales' },
    { nombre: 'Aros de Cebolla', descripcion: 'Porción adicional', precio: 35.00, categoria: 'Adicionales' },
    { nombre: 'Queso Extra', descripcion: 'Porción adicional', precio: 20.00, categoria: 'Adicionales' },
    { nombre: 'Tocino Extra', descripcion: 'Porción adicional', precio: 25.00, categoria: 'Adicionales' },
    { nombre: 'Champiñones Extra', descripcion: 'Porción adicional', precio: 20.00, categoria: 'Adicionales' },
    { nombre: 'Jalapeños', descripcion: 'Porción adicional', precio: 10.00, categoria: 'Adicionales' },
];

async function main() {
  console.log('🌱 Iniciando Seed "Garage Wings" (Actualizado)...');

  const passwordSimple = '123'; // En producción usa bcrypt

  // 1. EMPRESA Y SUCURSAL
  const empresa = await prisma.empresa.upsert({
    where: { nombre: 'Garage Wings' },
    update: {},
    create: { nombre: 'Garage Wings', logoUrl: 'assets/wings3.jpg' }
  });

  // Verificar si ya existe la sucursal
  let sucursal = await prisma.sucursal.findFirst({
    where: { empresaId: empresa.id }
  });

  if (!sucursal) {
    sucursal = await prisma.sucursal.create({
      data: {
        nombre: 'Sucursal Centro',
        empresaId: empresa.id,
        direccion: 'Av. Principal 123'
      }
    });
    console.log('✅ Sucursal creada');
  } else {
    console.log('⏭️  Sucursal ya existe');
  }

  // 2. EMPLEADOS (con verificación)
  const empleados = [
    { nombre: 'Carlos', email: 'mesero@garage.com', password: passwordSimple, rol: RolEmpleado.MESERO },
    { nombre: 'Chef Luigi', email: 'cocina@garage.com', password: passwordSimple, rol: RolEmpleado.COCINA },
    { nombre: 'Barman Moe', email: 'barra@garage.com', password: passwordSimple, rol: RolEmpleado.BARRA },
    { nombre: 'Caja', email: 'caja@garage.com', password: passwordSimple, rol: RolEmpleado.CAJA },
  ];

  for (const emp of empleados) {
    const existe = await prisma.empleado.findUnique({ where: { email: emp.email } });
    if (!existe) {
      await prisma.empleado.create({
        data: {
          ...emp,
          sucursalId: sucursal.id,
          empresaId: empresa.id
        }
      });
      console.log(`✅ Empleado creado: ${emp.nombre}`);
    } else {
      console.log(`⏭️  Empleado ya existe: ${emp.nombre}`);
    }
  }

  // 3. MESAS (con verificación)
  const mesasExistentes = await prisma.mesa.count({ where: { sucursalId: sucursal.id } });
  
  if (mesasExistentes === 0) {
    const mesas: any[] = [];
    
    // Mesas Cuadradas (1-6)
    for (let i = 1; i <= 6; i++) {
      mesas.push({
        numero: `M${i}`,
        capacidad: 4,
        tipo: 'cuadrada',
        estado: EstadoMesa.DISPONIBLE,
        sucursalId: sucursal.id,
        posX: (i - 1) * 150,
        posY: 50
      });
    }

    // Mesas Rectangulares (7-12)
    for (let i = 7; i <= 12; i++) {
      mesas.push({
        numero: `M${i}`,
        capacidad: 2,
        tipo: 'rectangular',
        estado: EstadoMesa.DISPONIBLE,
        sucursalId: sucursal.id,
        posX: (i - 7) * 150,
        posY: 250
      });
    }

    await prisma.mesa.createMany({ data: mesas });
    console.log('✅ 12 Mesas creadas');
  } else {
    console.log(`⏭️  Ya existen ${mesasExistentes} mesas`);
  }

  // 4. CATEGORÍAS Y PRODUCTOS
  const categoriasUnicas = [...new Set(productosData.map(p => p.categoria))];
  const categoriaMap: Record<string, number> = {};

  const coloresCategoria: Record<string, string> = {
    'Bar': '#e67e22',
    'Bebidas': '#3498db',
    'Hamburguesas': '#e74c3c',
    'Sushis Naturales': '#1abc9c',
    'Sushis Horneados': '#f39c12',
    'Paquetes': '#9b59b6',
    'Orientales': '#e91e63',
    'Entradas': '#16a085',
    'Adicionales': '#95a5a6',
  };

  for (const nombreCat of categoriasUnicas) {
    let cat = await prisma.categoria.findFirst({
      where: { empresaId: empresa.id, nombre: nombreCat }
    });

    if (!cat) {
      cat = await prisma.categoria.create({
        data: {
          nombre: nombreCat,
          empresaId: empresa.id,
          iconoColor: coloresCategoria[nombreCat] || '#3498db'
        }
      });
      console.log(`✅ Categoría creada: ${nombreCat}`);
    } else {
      console.log(`⏭️  Categoría ya existe: ${nombreCat}`);
    }
    
    categoriaMap[nombreCat] = cat.id;
  }

  // Insertar Productos
  let productosCreados = 0;
  let productosOmitidos = 0;

  for (const prod of productosData) {
    const existe = await prisma.producto.findFirst({
      where: {
        empresaId: empresa.id,
        nombre: prod.nombre
      }
    });

    if (!existe) {
      // ✅ Lógica de Destino
      const esBebida = prod.categoria === 'Bar' || prod.categoria === 'Bebidas';
      const esHamburguesa = prod.categoria === 'Hamburguesas';

      let config: any = undefined;

      // Configuración especial para hamburguesas
      if (esHamburguesa) {
        config = [
          {
            titulo: "Término",
            tipo: "radio",
            obligatorio: true,
            opciones: [{ nombre: "Medio", precio: 0 }, { nombre: "3/4", precio: 0 }, { nombre: "Bien Cocido", precio: 0 }]
          },
          {
            titulo: "Extras",
            tipo: "checkbox",
            obligatorio: false,
            opciones: [{ nombre: "Tocino Extra", precio: 20 }, { nombre: "Queso Extra", precio: 15 }]
          }
        ];
      }

      await prisma.producto.create({
        data: {
          nombre: prod.nombre,
          descripcion: prod.descripcion,
          precioBase: prod.precio,
          empresaId: empresa.id,
          categoriaId: categoriaMap[prod.categoria],
          // ✅ Asignación del destino correcto
          destino: esBebida ? DestinoProducto.BARRA : DestinoProducto.COCINA,
          configuracion: config ? config : undefined
        }
      });
      productosCreados++;
    } else {
      productosOmitidos++;
    }
  }

  console.log(`\n📊 Resumen de Productos:`);
  console.log(`   ✅ Creados: ${productosCreados}`);
  console.log(`   ⏭️  Omitidos: ${productosOmitidos}`);
  
  console.log('\n🚀 Seed finalizado con éxito.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });