import { IsNumber, IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ItemPedidoDto {
  @IsNumber()
  producto_id: number;
  @IsNumber()
  cantidad: number;
  @IsNumber()
  precio_item: number;
  @IsString()
  @IsOptional()
  notas?: string;
  @IsOptional()
  opcionesElegidas?: any;
}

export class CreatePedidoDto {
  @IsNumber()
  @IsOptional()
  mesa_id?: number; 

  @IsNumber()
  empleado_id: number;

  @IsNumber()
  @IsOptional()
  mesero_id?: number;

  @IsNumber()
  @IsOptional()
  comensales?: number;

  // ✅ ESTO ES LO IMPORTANTE:
  // Si esto no está aquí, el nombre "Julio" se borra antes de guardarse.
  @IsString()
  @IsOptional()
  nota_general?: string;

  @IsString()
  @IsOptional()
  notaGeneral?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  @IsOptional()
  items?: ItemPedidoDto[];
}