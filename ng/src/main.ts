import { enableProdMode } from "@angular/core";

import { environment } from "./environments/environment";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { appConfig } from "./app.config";

if (environment.production) {
  enableProdMode();
}

// platformBrowserDynamic()
//   .bootstrapModule(AppModule)
//   .catch((err) => console.error(err));


  bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

//   @NgModule({
//     declarations:
//         [AppComponent,
//             HeaderComponent,
//             ButtonInstallerComponent,
//             ButtonTemplateComponent
//         ],
//     bootstrap: [AppComponent],
//     imports: [
//         BrowserModule,
//         SxcRootModule,
//         ContentManagerModule,
//         FormsModule,
//         BrowserAnimationsModule,
//         MatIconModule,
//         ReactiveFormsModule],
//     providers: [provideHttpClient(withInterceptorsFromDi())]
// })
// export class AppModule { }