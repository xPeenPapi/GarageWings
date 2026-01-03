import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleItemModalComponent } from './detalle-item-modal.component';

describe('DetalleItemModalComponent', () => {
  let component: DetalleItemModalComponent;
  let fixture: ComponentFixture<DetalleItemModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleItemModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleItemModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
