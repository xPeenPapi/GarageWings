import { PrismaClient, RolEmpleado, EstadoMesa, DestinoProducto } from '@prisma/client';

// SIN BCRYPT: Las contraseñas se guardarán tal cual ('123')
const prisma = new PrismaClient();

// LISTA DE PRODUCTOS
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
];

async function main() {
  console.log('🌱 Iniciando Seed "Garage Wings" (Texto Plano)...');

  const passwordSimple = '123'; // Contraseña directa

  // 1. EMPRESA Y SUCURSAL
  const empresa = await prisma.empresa.upsert({
    where: { nombre: 'Garage Wings' },
    update: {},
    create: { nombre: 'Garage Wings', logoUrl: 'assets/wings3.jpg' }
  });

  const sucursal = await prisma.sucursal.create({
    data: {
      nombre: 'Sucursal Centro',
      empresaId: empresa.id,
      direccion: 'Av. Principal 123'
    }
  });

  // 2. EMPLEADOS
  await prisma.empleado.createMany({
    data: [
      { nombre: 'Carlos', email: 'mesero@garage.com', password: passwordSimple, rol: RolEmpleado.MESERO, sucursalId: sucursal.id, empresaId: empresa.id },
      { nombre: 'Chef Luigi', email: 'cocina@garage.com', password: passwordSimple, rol: RolEmpleado.COCINA, sucursalId: sucursal.id, empresaId: empresa.id },
      { nombre: 'Barman Moe', email: 'barra@garage.com', password: passwordSimple, rol: RolEmpleado.BARRA, sucursalId: sucursal.id, empresaId: empresa.id },
      { nombre: 'Caja', email: 'caja@garage.com', password: passwordSimple, rol: RolEmpleado.CAJA, sucursalId: sucursal.id, empresaId: empresa.id },
    ]
  });

  console.log('✅ Empleados creados con contraseña plana "123"');

  // 3. MESAS
  const mesas: any[] = [];
  
  // 6 Mesas Cuadradas (Fila 1)
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

  // 6 Mesas Rectangulares (Fila 2)
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
  console.log('✅ 12 Mesas creadas correctamente');

  // 4. PRODUCTOS Y CATEGORÍAS
  const categoriasUnicas = [...new Set(productosData.map(p => p.categoria))];
  const categoriaMap: Record<string, number> = {};

  for (const nombreCat of categoriasUnicas) {
    const cat = await prisma.categoria.create({
      data: { nombre: nombreCat, empresaId: empresa.id }
    });
    categoriaMap[nombreCat] = cat.id;
  }

  // Insertar Productos
  for (const prod of productosData) {
    const esBebida = prod.categoria === 'Bar' || prod.categoria === 'Bebidas';
    const esHamburguesa = prod.categoria === 'Hamburguesas';

    let config: any = undefined;
    
    if (esHamburguesa) {
      config = [
        {
          titulo: "Término",
          tipo: "radio",
          obligatorio: true,
          opciones: [{ nombre: "Medio", precio: 0 }, { nombre: "3/4", precio: 0 }]
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
        destino: esBebida ? DestinoProducto.BARRA : DestinoProducto.COCINA,
        configuracion: config ? config : undefined 
      }
    });
  }

  console.log(`✅ ${productosData.length} Productos insertados`);
  console.log('🚀 Seed finalizado. Login: mesero@garage.com / 123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });