import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CobrarModalComponent } from './cobrar-modal.component';

describe('CobrarModalComponent', () => {
  let component: CobrarModalComponent;
  let fixture: ComponentFixture<CobrarModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CobrarModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CobrarModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
