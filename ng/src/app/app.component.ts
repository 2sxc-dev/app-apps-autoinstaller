import { Component, ElementRef, HostListener } from '@angular/core';
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
  rules!: BehaviorSubject<any>;

  selectedAppsArr: Apps[] = []; // array welches wir mit ausgewählten Apps befühlen / ist kein observable

  isAllSelected!: BehaviorSubject<{}>; // observable mit true oder false der selecte box auszuwählten / abzuwählen
  isTilesView: boolean = true; // view von tile zu list je nach dem andere klassen einblenden, beim start tile

  // SEARCH STRING FOR SEARCH PIPE
  searchText: string = '';

  // URL PARAMETERS
  params = new URLSearchParams(window.location.search);
  sxcVersion = this.params.get("sxcversion");
  sysversion = this.params.get("sysversion");
  sexyContentVersion = this.params.get("2SexyContentVersion");
  moduleId = this.params.get("ModuleId");
  hasUrlParams = true;


  @HostListener('window:message', ['$event']) onPostMessage(event) {
    if (typeof event.data == 'string') {
      const messageDate = JSON.parse(event.data);

      if (messageDate.action == 'specs' && messageDate.data != undefined) {
        this.rules.next(messageDate.data.rules);
      }
    }
  }

  ngOnInit(): void {
    var message = { 'action': 'specs', 'moduleId': this.moduleId };
    window.parent.postMessage(JSON.stringify(message), '*');

    this.hasUrlParams = this.params.has("sysversion") && this.params.has("sxcversion") && this.params.has("2SexyContentVersion");

    this.isAllSelected = new BehaviorSubject({ selected: true, forced: false }); // zuerst sind alle checkboxen ausgewählt und true
    this.selectedApps = new BehaviorSubject([]); //hier werden die ausgewählten elemente hinzugefügt
    this.rules = new BehaviorSubject([]); //hier werden die ausgewählten elemente hinzugefügt

    this.apps$ = this.dataService.getApp(this.sxcVersion, this.sysversion, this.sexyContentVersion, this.moduleId).pipe(
      combineLatestWith(this.isAllSelected, this.rules), // abhänigkeit von apps$ ist das Mockup APPS und die selected
      map(([apps, allSelected, rules]) => {
        this.selectedAppsArr = []; // erstelle ein leeres Array

        var allForbidden = rules.filter(rule => rule.mode == 'f' && rule.target == 'all').length >= 1;
        allForbidden = false; // zum testen

        console.log(rules)

        if (allForbidden)
          return [];

        apps.forEach(app => {
          const isOptional = rules.filter(rule => rule.mode == 'o' && rule.target == 'guid' && rule.appGuid == app.guid).length == 1;

          app.isSelected = isOptional && !allSelected.forced ? false : allSelected.selected;
          app.isForbidden = rules.filter(rule => rule.mode == 'f' && rule.target == 'guid' && rule.appGuid == app.guid).length == 1 // hier muss die abfrage auf die rules

          if (app.isSelected && !app.isForbidden) { // wenn app selectet ist
            this.selectedAppsArr.push(app) // füge die app in das Arry hinzu wenn es ausgewählt wird
          }
        });

        apps.sort((a, b) => a.displayName.localeCompare(b.displayName)) // Sotieren von A - Z

        console.log(apps)
        console.log(this.selectedAppsArr)

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
    //test click div
    console.log('div click works')
    console.log(urlKey)
    console.log(this.selectedAppsArr)

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
    const appsToInstall = this.selectedAppsArr.map(data => {
      return { displayName: data.displayName, url: data.downloadUrl };
    });

    console.log(appsToInstall)
    var message = { 'action': 'install', 'moduleId': this.moduleId, 'packages': appsToInstall }; // werte die übergeben werden wie z.b. die ausgewählten Apps
    window.parent.postMessage(JSON.stringify(message), '*'); // message wir an das übergeortente fenster weitergeben / der code wird mit Iframe eingebunden
  }

  toggleSelection(val: boolean) {
    this.isAllSelected.next({ selected: val, forced: true }); // der wert true oder false (val von html) wird an den observable übergeben, jenach dem werden sie alle checked / unchecked
  }

  toggleView(mode: string) {
    this.isTilesView = mode == "tiles" ? true : false; // wenn es true ist, wird es beim klicken false und umgekehrt
  }
}


