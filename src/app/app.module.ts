import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TshirtOverlayComponent } from './tshirt-overlay/tshirt-overlay.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { FormsModule } from '@angular/forms';
@NgModule({
  declarations: [AppComponent, TshirtOverlayComponent],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [provideAnimationsAsync()],
  bootstrap: [AppComponent],
})
export class AppModule {}
