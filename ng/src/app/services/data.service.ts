import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  params = new URLSearchParams(window.location.search);

  sxcVersion = this.params.get("sxcversion");
  sysversion = this.params.get("sysversion");
  SexyContentVersion = this.params.get("SexyContentVersion");
  ModuleId = this.params.get("ModuleId");

  //https://2sxc.org/en/2sic-funktionstestseite/autoinstaller-test?ModuleId=1199&SexyContentVersion=13.11.00&platform=Dnn&sysversion=9.1.1&sxcversion=11.07.03
  //https://2sxc.org/en/2sic-funktionstestseite/autoinstaller-test?ModuleId=1199&SexyContentVersion=13.11.00&platform=Dnn&sysversion=9.9.1&sxcversion=13.11.00

  private url: string = `https://2sxc.org/en/api/2sxc/app/App-Installer/api/AppInstaller/GetAutoInstallerApps?ModuleId=${this.ModuleId}&SexyContentVersion=${this.SexyContentVersion}&platform=Dnn&sysversion=${this.sysversion}&sxcversion=${this.sxcVersion}`
  // private url: string = '/Portals/0/2sxc/App-Installer/ng/src/assets/data.json'

  getApp(): any {
    return this.http.get(this.url)
  }

}
