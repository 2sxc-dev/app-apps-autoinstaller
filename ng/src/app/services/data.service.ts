import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { share } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  getApps(sxcVersion: string, sysversion: string, sexyContentVersion: string, moduleId: string): any {
    const url = `${environment.baseUrl}/en/api/2sxc/app/App-Installer/api/AppInstaller/GetAutoInstallerApps?ModuleId=${moduleId}&SexyContentVersion=${sexyContentVersion}&platform=Dnn&sysversion=${sysversion}&sxcversion=${sxcVersion}`
    return this.http.get(url).pipe(
      share()
    );
  }
}
