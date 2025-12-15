import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map, share } from "rxjs";
import { environment } from "src/environments/environment";
import { Context, SxcApp } from "@2sic.com/sxc-angular";

@Injectable({
  providedIn: "root",
})
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
    const edition = this.sxcContext.apiEdition;
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
  getExtensions() {
    const url = `/api/2sxc/app/auto/query/Extensions`;

    return this.http.get<any>(url).pipe(
      map((res) =>
        (res?.Default ?? []).map((i) => ({
          guid: i.AppGuid,
          displayName: i.Title,
          urlKey: i.UrlKey,
          icon: i.Icon,
          version: i.Releases?.[0]?.Title ?? "",
          gitHub: i.Github,
          gitHubRelease: i.Github,
          downloadUrl: i.Github,
          isSelected: false,
        }))
      ),
      share()
    );
  }
}
