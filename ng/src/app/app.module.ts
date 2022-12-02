import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { ContentManagerModule, SxcRootModule } from '@2sic.com/sxc-angular';
import { AppComponent } from "./app.component";
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatIconModule} from '@angular/material/icon';
import { SearchPipe } from './search.pipe';



@NgModule({
  declarations: [
    AppComponent,
      SearchPipe
   ],
  imports: [
    BrowserModule,
    HttpClientModule,
    SxcRootModule,
    ContentManagerModule,
    FormsModule,
    BrowserAnimationsModule,
    MatIconModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
