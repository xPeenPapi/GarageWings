import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnviarCocinaModalComponent } from './enviar-cocina-modal.component';

describe('EnviarCocinaModalComponent', () => {
  let component: EnviarCocinaModalComponent;
  let fixture: ComponentFixture<EnviarCocinaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnviarCocinaModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnviarCocinaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
