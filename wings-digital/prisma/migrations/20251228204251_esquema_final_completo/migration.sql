-- CreateTable
CREATE TABLE `empresas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `logo_url` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `empresas_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sucursales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_id` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `telefono` VARCHAR(20) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empleados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_id` INTEGER NULL,
    `sucursal_id` INTEGER NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `rol` ENUM('SUPER_ADMIN', 'ADMIN_EMPRESA', 'GERENTE', 'CAJA', 'MESERO', 'COCINA', 'BARRA') NOT NULL DEFAULT 'MESERO',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `en_vacaciones` BOOLEAN NOT NULL DEFAULT false,
    `fecha_contratacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `empleados_email_key`(`email`),
    INDEX `empleados_empresa_id_idx`(`empresa_id`),
    INDEX `empleados_sucursal_id_idx`(`sucursal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mesas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sucursal_id` INTEGER NOT NULL,
    `numero` VARCHAR(20) NOT NULL,
    `capacidad` INTEGER NOT NULL DEFAULT 4,
    `estado` ENUM('DISPONIBLE', 'OCUPADA', 'SUCIA') NOT NULL DEFAULT 'DISPONIBLE',
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'cuadrada',
    `pos_x` INTEGER NOT NULL DEFAULT 0,
    `pos_y` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `mesas_sucursal_id_numero_key`(`sucursal_id`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_id` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `iconoColor` VARCHAR(50) NULL,

    UNIQUE INDEX `categorias_empresa_id_nombre_key`(`empresa_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empresa_id` INTEGER NOT NULL,
    `categoria_id` INTEGER NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NULL,
    `precio_base` DECIMAL(10, 2) NOT NULL,
    `imagen_url` VARCHAR(255) NULL,
    `destino` ENUM('COCINA', 'BARRA') NOT NULL DEFAULT 'COCINA',
    `configuracion_json` JSON NULL,

    INDEX `productos_empresa_id_idx`(`empresa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sucursal_productos` (
    `sucursal_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,
    `disponible` BOOLEAN NOT NULL DEFAULT true,
    `stock` INTEGER NULL,

    PRIMARY KEY (`sucursal_id`, `producto_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ordenes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mesa_id` INTEGER NULL,
    `empleado_id` INTEGER NULL,
    `estado` ENUM('PENDIENTE', 'EN_PREPARACION', 'LISTA', 'ENTREGADA', 'CERRADA', 'CANCELADA', 'PAGADA') NOT NULL DEFAULT 'PENDIENTE',
    `comensales` INTEGER NOT NULL DEFAULT 1,
    `total` DECIMAL(10, 2) NULL,
    `notaGeneral` TEXT NULL,
    `creada_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cerrada_en` DATETIME(3) NULL,
    `propina` DOUBLE NULL DEFAULT 0,
    `metodoPago` VARCHAR(191) NULL,

    INDEX `ordenes_mesa_id_idx`(`mesa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items_orden` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orden_id` INTEGER NOT NULL,
    `producto_id` INTEGER NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precio_unitario` DECIMAL(10, 2) NOT NULL,
    `opciones_elegidas` JSON NULL,
    `estado` ENUM('PENDIENTE', 'EN_PREPARACION', 'LISTA', 'ENTREGADA', 'CERRADA', 'CANCELADA', 'PAGADA') NOT NULL DEFAULT 'PENDIENTE',
    `notas` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orden_id` INTEGER NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `metodo` VARCHAR(50) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sucursales` ADD CONSTRAINT `sucursales_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `empleados` ADD CONSTRAINT `empleados_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `empleados` ADD CONSTRAINT `empleados_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mesas` ADD CONSTRAINT `mesas_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categorias` ADD CONSTRAINT `categorias_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sucursal_productos` ADD CONSTRAINT `sucursal_productos_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sucursal_productos` ADD CONSTRAINT `sucursal_productos_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes` ADD CONSTRAINT `ordenes_mesa_id_fkey` FOREIGN KEY (`mesa_id`) REFERENCES `mesas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes` ADD CONSTRAINT `ordenes_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_orden` ADD CONSTRAINT `items_orden_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `ordenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items_orden` ADD CONSTRAINT `items_orden_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagos` ADD CONSTRAINT `pagos_orden_id_fkey` FOREIGN KEY (`orden_id`) REFERENCES `ordenes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
