import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TshirtOverlayComponent } from './tshirt-overlay.component';

describe('TshirtOverlayComponent', () => {
  let component: TshirtOverlayComponent;
  let fixture: ComponentFixture<TshirtOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TshirtOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TshirtOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
