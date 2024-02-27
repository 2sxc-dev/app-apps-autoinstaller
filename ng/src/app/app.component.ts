import { Component, ElementRef, HostListener } from "@angular/core";
import { SxcAppComponent, Context } from "@2sic.com/sxc-angular";
import { App, Rules, Selected } from "./app-interface";
import {
  BehaviorSubject,
  combineLatestWith,
  debounceTime,
  map,
  Observable,
  share,
} from "rxjs";
import { DataService } from "./services/data.service";
import { FormControl } from "@angular/forms";
import { environment } from "../environments/environment";

// LINK: https://2sxc.org/apps/auto-install-15?ModuleId=1199&2SexyContentVersion=13.11.00&platform=Dnn&sysversion=9.1.1&sxcversion=13.01.03

// app runs on 2sxc.org under apps on the auto install page.
// Npm local-ssl and localhost:4200

enum ViewModes {
  Tiles = "tiles",
  List = "list",
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent extends SxcAppComponent {
  baseUrl: string = environment.baseUrl;

  appsFilteredByRules$!: Observable<App[]>; //all apps from the service
  apps$!: Observable<App[]>; //all apps filtered by rules
  sxcRules = new BehaviorSubject<Rules[]>([]);
  searchString = new BehaviorSubject<string>("");
  isAllSelected = new BehaviorSubject<Selected>({
    selected: true,
    forced: false,
  }); // observable to select / deselect with true or false of the selecte box
  selectedApp = new BehaviorSubject(<App>{});

  selectedApps: App[]; // array for PostMessage

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

  constructor(
    el: ElementRef,
    context: Context,
    private dataService: DataService
  ) {
    super(el, context);
  }

  // Message received from the outer window
  @HostListener("window:message", ["$event"]) onPostMessage(event) {
    if (typeof event.data == "string") {
      const messageDate = JSON.parse(event.data);
      // TODO:: Message from the outer window (Install Apps)
      console.log(event.data);

      if (messageDate.action == "specs" && messageDate.data != undefined) {
        this.sxcRules.next(messageDate.data.rules || []);
      }
    }
  }

  ngOnInit(): void {
    // send a specs message from the Ifram to the outer window
    var message = { action: "specs", moduleId: this.moduleId };
    window.parent.postMessage(JSON.stringify(message), "*");

    this.hasUrlParams =
      this.params.has("sysversion") &&
      this.params.has("sxcversion") &&
      this.params.has("2SexyContentVersion");

    this.searchForm.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.isAllSelected.next({ selected: true, forced: false });
      this.searchString.next(value);
    });

    // filter data from the service to the rules
    this.appsFilteredByRules$ = this.dataService
      .getApps(
        this.sxcVersion,
        this.sysversion,
        this.sexyContentVersion,
        this.moduleId
      )
      .pipe(
        combineLatestWith(this.sxcRules),
        map(([apps, sxcrules]) => {
          // check if all apps are forbidden
          var allForbidden =
            sxcrules.filter((rule: Rules) => rule.mode == "f" && rule.target == "all")
              .length >= 1;

            // if all apps are forbidden, only the apps that are allowed (whitelisten) by the rules are displayed
          if (allForbidden) {
            const appsAllowedBySxcRules = apps.filter(
              (app) =>
                sxcrules.filter(
                  (rule: Rules) =>
                    rule.mode == "a" &&
                    rule.target == "guid" &&
                    rule.appGuid == app.guid
                ).length > 0
            );
            if (appsAllowedBySxcRules.length > 0) {
              return appsAllowedBySxcRules;
            }
            return [];
          }
          // if all apps are allowed, only the apps that are forbidden (blacklisten) by the rules are displayed
          const forbiddenApps = apps.filter(
            (app) =>
              sxcrules.filter(
                (rule: Rules) =>
                  rule.mode == "f" &&
                  rule.target == "guid" &&
                  rule.appGuid == app.guid
              ).length > 0
          );
          const allowedApps = apps.filter(
            (app) => !forbiddenApps.includes(app)
          );

          // if the app is optional, the checkbox is not selected
          allowedApps.forEach((app) => {
            const isOptional =
              sxcrules.filter(
                (rule: Rules) =>
                  rule.mode == "o" &&
                  rule.target == "guid" &&
                  rule.appGuid == app.guid
              ).length == 1;
            app.isSelected = isOptional ? false : true;
          });

          allowedApps.sort((a, b) =>
            a.displayName.localeCompare(b.displayName)
          ); // sorted apps von A - Z

          return allowedApps;
        })
      );

    // all Apps
    this.apps$ = this.appsFilteredByRules$.pipe(
      combineLatestWith(
        this.isAllSelected,
        this.searchString,
        this.selectedApp
      ), // dependence from apps$
      map(([apps, allSelected, searchString, selectedApp]) => {
        const searchedApps = apps.filter((item: App) => {
          return item.displayName
            .toLocaleLowerCase()
            .includes(searchString.toLowerCase());
        });

        const appsToChangeSelection = searchString != "" ? searchedApps : apps;

        appsToChangeSelection.forEach((app) => {
          app.isSelected = allSelected.forced
            ? allSelected.selected
            : app.isSelected;
        });

        // number of selected apps to install
        this.selectedApps = apps.filter((app) => app.isSelected == true) || [];

        // number of unselected or selected
        const selected = searchedApps.filter((app) => app.isSelected == true);
        this.appsToUnselectLength = selected.length;
        this.appToSelectLength =
          searchedApps.length - this.appsToUnselectLength;

        return searchedApps; // return the apps with the new status to the apps$ we access late
      }),
      share()
    );
  }

  // select or unselect checkboxes
  onAppClickEvent(tagName: string, app: App) {
    // mat-icon like a are not used for select and should redirect to a link
    if (tagName == "A" || tagName == "MAT-ICON") return;

    this.isAllSelected.next({ selected: true, forced: false });

    app.isSelected = !app.isSelected;
    this.selectedApp.next(app); // behavior pass an app with isSelected status
  }

  // sends the selected apps with the displayNmae and url to the outer window
  postAppsToInstall() {
    const appsToInstall = this.selectedApps.map((data) => {
      return { displayName: data.displayName, url: data.downloadUrl };
    });

    var message = {
      action: "install",
      moduleId: this.moduleId,
      packages: appsToInstall,
    };
    window.parent.postMessage(JSON.stringify(message), "*");
  }

  // checkboxen state true or false
  toggleAppSelection(val: boolean) {
    this.isAllSelected.next({ selected: val, forced: true });
  }

  // List or tiles view switchen
  changeView(mode: string) {
    this.currentMode = mode;
  }
}
