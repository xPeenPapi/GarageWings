import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DividirCuentaModalComponent } from './dividir-cuenta-modal.component';

describe('DividirCuentaModalComponent', () => {
  let component: DividirCuentaModalComponent;
  let fixture: ComponentFixture<DividirCuentaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividirCuentaModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DividirCuentaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
