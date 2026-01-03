import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PantallaCocinaComponent } from './pantalla-cocina.component';

describe('PantallaCocinaComponent', () => {
  let component: PantallaCocinaComponent;
  let fixture: ComponentFixture<PantallaCocinaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PantallaCocinaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PantallaCocinaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
