import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdicionalesModalComponent } from './adicionales-modal.component';

describe('AdicionalesModalComponent', () => {
  let component: AdicionalesModalComponent;
  let fixture: ComponentFixture<AdicionalesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdicionalesModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdicionalesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
