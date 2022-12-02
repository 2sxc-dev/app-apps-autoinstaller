import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  getApp(sxcVersion: string, sysversion: string, sexyContentVersion: string, moduleId: string): any {
    const url = `https://2sxc.org/en/api/2sxc/app/App-Installer/api/AppInstaller/GetAutoInstallerApps?ModuleId=${moduleId}&SexyContentVersion=${sexyContentVersion}&platform=Dnn&sysversion=${sysversion}&sxcversion=${sxcVersion}`
    return this.http.get(url);
  }
}


  //https://2sxc.org/en/2sic-funktionstestseite/autoinstaller-test?ModuleId=1199&SexyContentVersion=13.11.00&platform=Dnn&sysversion=9.1.1&sxcversion=11.07.03
