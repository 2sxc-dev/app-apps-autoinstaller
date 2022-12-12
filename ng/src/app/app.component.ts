import { Component, ElementRef, HostListener } from '@angular/core';
import { SxcAppComponent, Context } from '@2sic.com/sxc-angular';
import { Apps, Rules } from './app-interface';
import { BehaviorSubject, combineLatestWith, debounceTime, delay, map, Observable, share, tap } from 'rxjs';
import { DataService } from './services/data.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends SxcAppComponent {
  constructor(el: ElementRef, context: Context, private dataService: DataService) {
    super(el, context);
  }

  appsFilteredByRules$!: Observable<Apps[]>; //all apps from the service
  rules!: BehaviorSubject<Rules[]>; // rules from 2sxc
  apps$!: Observable<Apps[]>; //all apps filtered by rules
  searchString!: BehaviorSubject<string>;

  searchedAppsLenght: number;
  selectedLength: number;
  isSelectLenghtNull: boolean
  unSelectedLength: number;
  isUnSelectLenghtNull: boolean
  selectedApp!: BehaviorSubject<Apps>;
  selectedAppCounter: number;
  selectedApps: Apps[];

  isAllSelected!: BehaviorSubject<any>; // observable to select / deselect with true or false of the selecte box
  isTilesView: boolean = true; // view from tile to list depending on which other classes are shown, at start tile

  searchForm = new FormControl();

  // URL PARAMETERS
  params = new URLSearchParams(window.location.search);
  sxcVersion = this.params.get("sxcversion");
  sysversion = this.params.get("sysversion");
  sexyContentVersion = this.params.get("2SexyContentVersion");
  moduleId = this.params.get("ModuleId");
  hasUrlParams = true;

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
      debounceTime(0) // 300-400 ms
    ).subscribe(value => {
      this.isAllSelected.next({ selected: true, forced: false });
      this.searchString.next(value)
    })

    // filter data from the service according to the rules
    this.appsFilteredByRules$ = this.dataService.getApp(this.sxcVersion, this.sysversion, this.sexyContentVersion, this.moduleId).pipe(
      combineLatestWith(this.rules),
      map(([apps, rules]) => {
        var allForbidden = rules.filter(rule => rule.mode == 'f' && rule.target == 'all').length >= 1;

        //Demo
        // allForbidden = false; // zum testen
        //Demo

        if (allForbidden) {
          const forbiddenAppsAllow = apps.filter(app => rules.filter(rule => rule.mode == 'a' && rule.target == 'guid' && rule.appGuid == app.guid).length > 0);
          if (forbiddenAppsAllow.length > 0) {
            return forbiddenAppsAllow
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

        this.searchedAppsLenght = searchedApps.length

        appsToChangeSelection.forEach(app => {
          app.isSelected = allSelected.forced ? allSelected.selected : app.isSelected;
        });

        // number of insall selected apps
        this.selectedApps = apps.filter(app => app.isSelected == true)
        this.selectedAppCounter = this.selectedApps.length;

        // number of unselected or selected
        const selected = searchedApps.filter(app => app.isSelected == true)
        this.unSelectedLength = selected.length;
        this.selectedLength = searchedApps.length - this.unSelectedLength

        if (this.selectedLength == 0) {
          this.isSelectLenghtNull = true
        } else {
          this.isSelectLenghtNull = false
        }

        if (this.unSelectedLength == 0) {
          this.isUnSelectLenghtNull = true
        } else {
          this.isUnSelectLenghtNull = false
        }

        return searchedApps; // return the apps with the new status to the apps$ we access late
      }),
      share(),
    )
  }


  toggleSelectedApp(event: any, app: Apps, urlKey: string) {
    // selecte or unselect checkboxes
    // mat-icon like a are not used for selct and should redirect to a link
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
    this.isTilesView = mode == "tiles" ? true : false;
  }
}


