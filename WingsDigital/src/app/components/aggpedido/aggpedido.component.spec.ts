import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AggpedidoComponent } from './aggpedido.component';

describe('AggpedidoComponent', () => {
  let component: AggpedidoComponent;
  let fixture: ComponentFixture<AggpedidoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AggpedidoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AggpedidoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
