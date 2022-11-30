import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { Apps } from '../app-interface';
import { APPS } from '../mock-up';
import { HttpClient } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor( private http: HttpClient) { }

  sxcVersion = "11.07.03";
  private url: string = `https://2sxc.org/en/api/2sxc/app/App-Installer/api/AppInstaller/GetAutoInstallerApps?ModuleId=410&SexyContentVersion=14.12.02&platform=Dnn&sysversion=9.9.1&sxcversion=${this.sxcVersion}`
  // private url: string = '/Portals/0/2sxc/App-Installer/ng/src/assets/data.json'

  getApp(): any {
    return this.http.get(this.url).pipe(
      tap(data => of(data))
    )
  }
  // @Info: https://medium.com/techiediaries-com/send-http-post-with-angular-9-8-httpclient-by-example-61e2dfdee8a9

}
