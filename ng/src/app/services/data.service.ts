import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, share } from "rxjs";
import { Context } from "@2sic.com/sxc-angular";

@Injectable({ providedIn: "root" })
export class DataService {
  constructor(private http: HttpClient, private sxcContext: Context) {}

  // App-Installer (Templates / Autoinstall)
  getApps(
    sxcVersion: string,
    sysversion: string,
    sexyContentVersion: string,
    moduleId: string,
    query: string = "AutoInstaller"
  ): any {
    const edition = this.sxcContext.apiEdition || "live";
    const url =
      `/en/api/2sxc/app/App-Installer/${edition}/api/AppListData/GetListOfData` +
      `?QueryName=${query}` +
      `&ModuleId=${moduleId}` +
      `&SexyContentVersion=${sexyContentVersion}` +
      `&platform=Dnn` +
      `&sysversion=${sysversion}` +
      `&sxcversion=${sxcVersion}`;

    return this.http.get(url).pipe(share());
  }

  // ✅ Extensions → AutoQuery
  getExtensions(
    sxcVersion: string,
    sysversion: string,
    sexyContentVersion: string,
    moduleId: string
  ) {
    const edition = this.sxcContext.apiEdition || "live";
    const url =
      `/en/api/2sxc/app/App-Installer/${edition}/api/AppListData/GetExtensions` +
      `?ModuleId=${moduleId}` +
      `&SexyContentVersion=${sexyContentVersion}` +
      `&platform=Dnn` +
      `&sysversion=${sysversion}` +
      `&sxcversion=${sxcVersion}`;
    return this.http.get<any[]>(url).pipe(
      map((res) =>
        (res ?? []).map((i) => ({
          guid: i.guid,
          displayName: i.displayName,
          urlKey: i.urlKey,
          icon: i.icon,
          version: i.version,
          gitHub: i.gitHub,
          gitHubRelease: i.gitHubRelease,
          downloadUrl: i.downloadUrl,
          isSelected: false,
        }))
      ),
      share()
    );
  }
}
