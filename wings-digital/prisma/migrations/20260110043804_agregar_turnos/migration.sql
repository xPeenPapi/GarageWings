-- CreateTable
CREATE TABLE `turnos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empleado_id` INTEGER NOT NULL,
    `sucursal_id` INTEGER NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `hora_inicio` VARCHAR(10) NOT NULL,
    `hora_fin` VARCHAR(10) NOT NULL,
    `notas` TEXT NULL,

    INDEX `turnos_empleado_id_idx`(`empleado_id`),
    INDEX `turnos_sucursal_id_idx`(`sucursal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `turnos` ADD CONSTRAINT `turnos_empleado_id_fkey` FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `turnos` ADD CONSTRAINT `turnos_sucursal_id_fkey` FOREIGN KEY (`sucursal_id`) REFERENCES `sucursales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
