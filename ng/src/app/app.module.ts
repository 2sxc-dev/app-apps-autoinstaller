import { NgModule } from "@angular/core";
import { ContentManagerModule, SxcRootModule } from "@2sic.com/sxc-angular";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { ReactiveFormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { AppComponent } from "./app.component";
import { HeaderComponent } from "./header/header.component";
import { ButtonInstallerComponent } from "./button-installer/button-installer.component";
import { ButtonTemplateComponent } from "./button-template/button-template.component";

@NgModule({
    declarations: [AppComponent, HeaderComponent, ButtonInstallerComponent, ButtonTemplateComponent],
    bootstrap: [AppComponent], imports: [BrowserModule,
        SxcRootModule,
        ContentManagerModule,
        FormsModule,
        BrowserAnimationsModule,
        MatIconModule,
        ReactiveFormsModule], providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class AppModule { }
