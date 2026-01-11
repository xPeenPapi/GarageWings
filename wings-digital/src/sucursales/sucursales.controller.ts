import { Controller, Get, Post, Body } from '@nestjs/common';
import { SucursalesService } from './sucursales.service';

@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Get()
  findAll() {
    return this.sucursalesService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.sucursalesService.create(data);
  }
}