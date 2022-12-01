import { Component, ElementRef } from '@angular/core';
import { SxcAppComponent, Context } from '@2sic.com/sxc-angular';
import { Apps } from './app-interface';
import { BehaviorSubject, combineLatestWith, delay, map, Observable, tap } from 'rxjs';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends SxcAppComponent {
  constructor(el: ElementRef, context: Context, private dataService: DataService) {
    super(el, context);
  }

  apps$!: Observable<Apps[]>; //alle apps als observable, greifen hier im html mit async darauf zurück
  selectedApps!: BehaviorSubject<Apps[]>; //hilfe observable anzahl in html anzuzeigen

  selectedAppsArr: Apps[] = []; // array welches wir mit ausgewählten Apps befühlen / ist kein observable
  isTilesView: boolean = true; // view von tile zu list je nach dem andere klassen einblenden, beim start tile
  appLenght: boolean = false;
  private isAllSelected!: BehaviorSubject<boolean>; // observable mit true oder false der selecte box auszuwählten / abzuwählen

  params = new URLSearchParams(window.location.search);
  sxcVersion = this.params.get("sxcversion");
  sysversion = this.params.get("sysversion");
  sexyContentVersion = this.params.get("SexyContentVersion");
  moduleId = this.params.get("ModuleId");
  hasUrlParams = true;

  ngOnInit(): void {

    this.hasUrlParams = this.params.has("sysversion") && this.params.has("sxcversion") && this.params.has("SexyContentVersion");

    this.isAllSelected = new BehaviorSubject(true); // zuerst sind alle checkboxen ausgewählt und true
    this.selectedApps = new BehaviorSubject([]); //hier werden die ausgewählten elemente hinzugefügt

    this.apps$ = this.dataService.getApp(this.sxcVersion, this.sysversion, this.sexyContentVersion, this.moduleId).pipe(
      combineLatestWith(this.isAllSelected), // abhänigkeit von apps$ ist das Mockup APPS und die selected
      map(([apps, allSelected]) => {
        this.selectedAppsArr = []; // erstelle ein leeres Array

        apps.forEach(app => {
          app.isSelected = allSelected; //übergib der app den status, ob es isSelected ist oder nicht, zubeinn sind alle selected


          if (app.isSelected) { // wenn app selectet ist
            this.selectedAppsArr.push(app) // füge die app in das Arry hinzu wenn es ausgewählt wird
          }
        });

        apps.sort((a, b) => a.displayName.localeCompare(b.displayName)) // Sotieren von A - Z

        return apps; // gib die apps mit dem neuen status in die apps$ zurück auf die wir später zugreiffen
      }),
      delay(0), // lösst problem von change detection
      tap(() => {
        this.selectedApps.next(this.selectedAppsArr); // füge das array in das behaviorsubjcet zu, so dass es verändernungen mit bekommt
      })
    )
  }

  changeValue(app: Apps, urlKey: string) { // über gibt die app und die urlKey
    const found = this.selectedAppsArr.some((app: Apps) => app.urlKey == urlKey); // finde die app, bei der die app.urlKey und urlkey gleich sind

    if (!found) {
      this.selectedAppsArr.push(app) // pusht die neue app in das Array und es wir vergrössert
    } else {
      const indexOfApps = this.selectedAppsArr.findIndex((app: Apps) => { // wird benötigt um den index herauszufinden
        return app.urlKey === urlKey; // finde die app, bei der die app.urlKey und die urlKey übereinander stimmt
      });

      this.selectedAppsArr.splice(indexOfApps, 1); // objekt wir an stelle Index aus dem arry entfernt
    }

    this.selectedApps.next(this.selectedAppsArr) // füge das array in das behaviorsubjcet zu, so dass es verändernungen mit bekommt
  }

  installApps() {
    var message = { 'action': 'install', 'moduleId': 'window.ModuleId', 'packages': this.selectedAppsArr }; // werte die übergeben werden wie z.b. die ausgewählten Apps
    window.parent.postMessage(JSON.stringify(message), '*'); // message wir an das übergeortente fenster weitergeben / der code wird mit Iframe eingebunden
  }

  toggleSelection(val: boolean) {
    this.isAllSelected.next(val); // der wert true oder false (val von html) wird an den observable übergeben, jenach dem werden sie alle checked / unchecked
  }

  toggleView() {
    this.isTilesView = !this.isTilesView; // wenn es true ist, wird es beim klicken false und umgekehrt
  }

}


