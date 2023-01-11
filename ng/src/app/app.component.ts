import { Component, ElementRef, HostListener } from '@angular/core';
import { SxcAppComponent, Context } from '@2sic.com/sxc-angular';
import { Apps, Rules, Selected } from './app-interface';
import { BehaviorSubject, combineLatestWith, debounceTime, map, Observable, share, } from 'rxjs';
import { DataService } from './services/data.service';
import { FormControl } from '@angular/forms';
import { environment } from '../environments/environment';


// LINK: https://2sxc.org/apps/auto-install-15?ModuleId=1199&2SexyContentVersion=13.11.00&platform=Dnn&sysversion=9.1.1&sxcversion=13.01.03

enum ViewModes {
  Tiles = 'tiles',
  List = 'list'
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends SxcAppComponent {
  baseUrl: string = environment.baseUrl;

  appsFilteredByRules$!: Observable<Apps[]>; //all apps from the service
  apps$!: Observable<Apps[]>; //all apps filtered by rules
  rules!: BehaviorSubject<Rules[]>; // rules from 2sxc
  searchString!: BehaviorSubject<string>;
  isAllSelected!: BehaviorSubject<Selected>; // observable to select / deselect with true or false of the selecte box
  selectedApp!: BehaviorSubject<Apps>;

  selectedApps: Apps[]; // array for PostMessage

  searchForm = new FormControl();

  appToSelectLength: number;
  appsToUnselectLength: number;
  viewModes = ViewModes;
  currentMode: string = ViewModes.Tiles;

  // URL PARAMETERS
  params = new URLSearchParams(window.location.search);
  sxcVersion = this.params.get("sxcversion");
  sysversion = this.params.get("sysversion");
  sexyContentVersion = this.params.get("2SexyContentVersion");
  moduleId = this.params.get("ModuleId");
  hasUrlParams = true;

  constructor(el: ElementRef, context: Context, private dataService: DataService) {
    super(el, context);
  }

  // Message received from the outer window
  @HostListener('window:message', ['$event']) onPostMessage(event) {
    if (typeof event.data == 'string') {
      const messageDate = JSON.parse(event.data);

      if (messageDate.action == 'specs' && messageDate.data != undefined) {
        this.rules.next(messageDate.data.rules || []);
      }
    }
  }

  ngOnInit(): void {
    // send a specs message from the Ifram to the outer window
    var message = { 'action': 'specs', 'moduleId': this.moduleId };
    window.parent.postMessage(JSON.stringify(message), '*');

    this.hasUrlParams = this.params.has("sysversion") && this.params.has("sxcversion") && this.params.has("2SexyContentVersion");

    this.isAllSelected = new BehaviorSubject({ selected: true, forced: false }); // Select all Checkbox
    this.rules = new BehaviorSubject<Rules[]>([]);
    this.searchString = new BehaviorSubject('');
    this.selectedApp = new BehaviorSubject(<Apps>{});

    this.searchForm.valueChanges.pipe(
      debounceTime(300)
    ).subscribe(value => {
      this.isAllSelected.next({ selected: true, forced: false });
      this.searchString.next(value)
    })

    // filter data from the service according to the rules
    this.appsFilteredByRules$ = this.dataService.getApps(this.sxcVersion, this.sysversion, this.sexyContentVersion, this.moduleId).pipe(
      combineLatestWith(this.rules),
      map(([apps, rules]) => {
        var allForbidden = rules.filter(rule => rule.mode == 'f' && rule.target == 'all').length >= 1;

        if (allForbidden) {
          const appsAllowedByRules = apps.filter(app => rules.filter(rule => rule.mode == 'a' && rule.target == 'guid' && rule.appGuid == app.guid).length > 0);
          if (appsAllowedByRules.length > 0) {
            return appsAllowedByRules
          }
          return [];
        }

        const forbiddenApps = apps.filter(app => rules.filter(rule => rule.mode == 'f' && rule.target == 'guid' && rule.appGuid == app.guid).length > 0);
        const allowedApps = apps.filter(app => !forbiddenApps.includes(app))

        allowedApps.forEach(app => {
          const isOptional = rules.filter(rule => rule.mode == 'o' && rule.target == 'guid' && rule.appGuid == app.guid).length == 1;
          app.isSelected = isOptional ? false : true;
        });

        allowedApps.sort((a, b) => a.displayName.localeCompare(b.displayName)) // sorted apps von A - Z

        return allowedApps;
      })
    )

    // alle gefilteren Apps wiedergeben
    this.apps$ = this.appsFilteredByRules$.pipe(
      combineLatestWith(this.isAllSelected, this.searchString, this.selectedApp), // dependence from apps$
      map(([apps, allSelected, searchString, selectedApp]) => {
        const searchedApps = apps.filter((item: Apps) => {
          return item.displayName.toLocaleLowerCase().includes(searchString.toLowerCase());
        })

        const appsToChangeSelection = searchString != "" ? searchedApps : apps;

        appsToChangeSelection.forEach(app => {
          app.isSelected = allSelected.forced ? allSelected.selected : app.isSelected;
        });

        // number of selected apps to install
        this.selectedApps = apps.filter(app => app.isSelected == true) || [];

        // number of unselected or selected
        const selected = searchedApps.filter(app => app.isSelected == true);
        this.appsToUnselectLength = selected.length;
        this.appToSelectLength = searchedApps.length - this.appsToUnselectLength;

        return searchedApps; // return the apps with the new status to the apps$ we access late
      }),
      share(),
    )
  }


  toggleSelectedApp(event: any, app: Apps) {
    // selecte or unselect checkboxes
    // mat-icon like a are not used for select and should redirect to a link
    if (event.target.tagName == 'A' || event.target.tagName == 'MAT-ICON')
      return;

    this.isAllSelected.next({ selected: true, forced: false })

    app.isSelected = !app.isSelected
    this.selectedApp.next(app) // behavior pass an app with isSelected status
  }

  postAppsToInstall() {
    // sends the selected apps with the displayNmae and url to the outer window
    const appsToInstall = this.selectedApps.map(data => {
      return { displayName: data.displayName, url: data.downloadUrl };
    });

    var message = { 'action': 'install', 'moduleId': this.moduleId, 'packages': appsToInstall };
    window.parent.postMessage(JSON.stringify(message), '*');
  }

  toggleAppSelection(val: boolean) {
    // checkboxen state true or false
    this.isAllSelected.next({ selected: val, forced: true });
  }

  toggleView(mode: string) {
    // List or tiles view switchen
    this.currentMode = mode;
  }
}


