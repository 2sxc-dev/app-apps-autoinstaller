import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { share } from "rxjs";
import { environment } from "src/environments/environment";
import { Context, SxcApp } from "@2sic.com/sxc-angular";
@Injectable({
  providedIn: "root",
})
export class DataService {
  constructor(private http: HttpClient, private sxcContext: Context) { }

  // Old code
  getApps2(
    sxcVersion: string,
    sysversion: string,
    sexyContentVersion: string,
    moduleId: string,
    query: string = "AutoInstaller"
  ): any {
    const url = `${environment.baseUrl}/en/api/2sxc/app/App-Installer/staging/api/AppInstaller/GetAutoInstallerApps?ModuleId=${moduleId}&SexyContentVersion=${sexyContentVersion}&platform=Dnn&sysversion=${sysversion}&sxcversion=${sxcVersion}`;
    return this.http.get(url).pipe(share());
  }

  // New Code 
  getApps(
    sxcVersion: string,
    sysversion: string,
    sexyContentVersion: string,
    moduleId: string,
    query: string = "AutoInstaller"
  ): any {
    const edition = this.sxcContext.apiEdition;
    const url = `${environment.baseUrl}/en/api/2sxc/app/App-Installer/${edition}/api/AppListData/GetListOfData?QueryName=${query}&ModuleId=${moduleId}&SexyContentVersion=${sexyContentVersion}&platform=Dnn&sysversion=${sysversion}&sxcversion=${sxcVersion}`;
    return this.http.get(url).pipe(share());
  }

}
