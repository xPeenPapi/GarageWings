import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PantallaBarraComponent } from './pantalla-barra.component';

describe('PantallaBarraComponent', () => {
  let component: PantallaBarraComponent;
  let fixture: ComponentFixture<PantallaBarraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PantallaBarraComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PantallaBarraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
