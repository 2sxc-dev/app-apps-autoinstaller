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
  take,
} from "rxjs";
import { DataService } from "./services/data.service";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { environment } from "../environments/environment";
import { HeaderComponent } from "./header/header.component";
import { ButtonInstallerComponent } from "./button-installer/button-installer.component";
import { ButtonTemplateComponent } from "./button-template/button-template.component";
import { MatIconModule } from "@angular/material/icon";
import { AsyncPipe } from "@angular/common";

// Enum for view modes (tiles or list)
enum ViewModes {
  Tiles = "tiles",
  List = "list",
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [
    HeaderComponent,
    ButtonInstallerComponent,
    ButtonTemplateComponent,
    MatIconModule,
    AsyncPipe,
    ReactiveFormsModule,
    FormsModule,
  ],
})
export class AppComponent extends SxcAppComponent {
  ViewModes = ViewModes; // Make enum available for template
  baseUrl: string = environment.baseUrl;

  // Observable of all apps after rules filtering
  filteredApps$!: Observable<App[]>;
  // Observable of displayable apps, filtered by search and selection state
  displayApps$!: Observable<App[]>;

  // State observables for rules, search, and selection
  sxcRules$ = new BehaviorSubject<Rules[]>([]);
  searchTerm$ = new BehaviorSubject<string>("");
  allSelected$ = new BehaviorSubject<Selected>({ selected: false, forced: true });
  selectedApp$ = new BehaviorSubject<App | null>(null);
  selectedApps: App[] = []; // Array of currently selected apps
  searchControl = new FormControl();

  numAppsToSelect: number = 0;
  numAppsToUnselect: number = 0;
  currentViewMode: ViewModes = ViewModes.Tiles;

  // URL parameters
  params = new URLSearchParams(window.location.search);
  moduleId = this.params.get("ModuleId");
  hasUrlParams = true;
  isTemplateMode = false;

  recommendedAppsTitle: string = "Recommended Apps for";

  constructor(
    el: ElementRef,
    context: Context,
    private dataService: DataService
  ) {
    super(el, context);
  }

  // Listen for postMessage from parent window (for rules updates)
  @HostListener("window:message", ["$event"])
  onPostMessage(event: MessageEvent) {
    if (typeof event.data !== "string") return;
    const message = JSON.parse(event.data);
    // Receive rules from parent
    if (message.action === "specs" && message.data?.rules) {
      this.sxcRules$.next(message.data.rules);
    }
  }

  ngOnInit(): void {
    this.sendSpecsRequestToParent();
    this.initParamsFromUrl();
    this.setupSearchControl();
    this.setupFilteredAppsStream();
    this.setupDisplayAppsStream();
  }

  // Request rules/specs from parent window
  private sendSpecsRequestToParent() {
    const message = { action: "specs", moduleId: this.moduleId };
    window.parent.postMessage(JSON.stringify(message), "*");
  }

  // Read initial state from URL parameters and set flags
  private initParamsFromUrl() {
    this.hasUrlParams =
      this.params.has("sysversion") &&
      this.params.has("sxcversion") &&
      this.params.has("2SexyContentVersion");

    this.isTemplateMode = this.params.has("isTemplate");

    // Pre-select all apps if not in template mode
    if (!this.isTemplateMode) {
      this.allSelected$.next({ selected: true, forced: true });
    }
  }

  // Set up debounced search
  private setupSearchControl() {
    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.searchTerm$.next(value ?? "");
    });
  }

  // Set up observable for filtered apps based on rules
  private setupFilteredAppsStream() {
    const queryType = this.isTemplateMode ? "TemplateList" : "AutoInstaller";
    const sxcVersion = this.params.get("sxcversion");
    const sysVersion = this.params.get("sysversion");
    const sexyContentVersion = this.params.get("2SexyContentVersion");
    this.filteredApps$ = this.dataService
      .getApps(
        sxcVersion,
        sysVersion,
        sexyContentVersion,
        this.moduleId,
        queryType
      )
      .pipe(
        combineLatestWith(this.sxcRules$),
        map(([apps, rules]) => this.applyRulesToApps(apps, rules))
      );
  }

  // Set up observable for displayable apps, considering selection and search
  private setupDisplayAppsStream() {
    this.displayApps$ = this.filteredApps$.pipe(
      combineLatestWith(
        this.allSelected$,
        this.searchTerm$,
        this.selectedApp$
      ),
      map(([apps, allSelected, searchTerm, selectedApp]) => {
        const filteredApps = this.filterAppsBySearch(apps, searchTerm);

        if (this.isTemplateMode) {
          // In template mode, only one app or none can be selected (radio-button style)
          let selectedKey = selectedApp && selectedApp.urlKey ? selectedApp.urlKey : null;
          filteredApps.forEach(app => app.isSelected = (app.urlKey === selectedKey));
        } else {
          // In installer mode, support multi-select and "select all"
          filteredApps.forEach(app => {
            app.isSelected = allSelected.forced
              ? allSelected.selected
              : app.isSelected;
          });
        }

        // Update selected apps array and selection counters
        this.selectedApps = filteredApps.filter(app => app.isSelected);
        this.numAppsToUnselect = this.selectedApps.length;
        this.numAppsToSelect = filteredApps.length - this.numAppsToUnselect;

        return filteredApps;
      }),
      share()
    );
  }

  // Filter and initialize apps based on rules (allowed/forbidden/optional)
  private applyRulesToApps(apps: App[], rules: Rules[]): App[] {
    if (apps.length === 0) return [];

    this.recommendedAppsTitle = "Recommended Apps for";

    // If all apps are forbidden, only show those explicitly allowed
    const allForbidden = rules.some(rule =>
      rule.mode === "f" && rule.target === "all"
    );

    if (allForbidden) {
      const allowed = apps.filter(app =>
        rules.some(rule =>
          rule.mode === "a" &&
          rule.target === "guid" &&
          rule.appGuid === app.guid
        )
      );
      return allowed.length > 0 ? allowed : [];
    }

    // Otherwise, exclude forbidden apps, mark optionals as not selected, rest are selected
    const forbiddenApps = apps.filter(app =>
      rules.some(rule =>
        rule.mode === "f" &&
        rule.target === "guid" &&
        rule.appGuid === app.guid
      )
    );
    const allowedApps = apps.filter(app => !forbiddenApps.includes(app));
    allowedApps.forEach(app => {
      const isOptional = rules.some(rule =>
        rule.mode === "o" &&
        rule.target === "guid" &&
        rule.appGuid === app.guid
      );
      app.isSelected = !isOptional;
    });
    allowedApps.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return allowedApps;
  }

  // Search apps by displayName using lowercase includes
  private filterAppsBySearch(apps: App[], searchTerm: string): App[] {
    if (!searchTerm) return apps;
    return apps.filter(app =>
      app.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Handles checkbox toggle for app selection.
   * In template mode: only one app can be selected (radio-style). Clicking selected again unselects all.
   * In installer mode: multi-select, disables allSelected forced mode for individual selection.
   */
  onAppCheckboxToggle(tagName: string, app: App): void {
    if (tagName === "A" || tagName === "MAT-ICON") return;

    if (this.isTemplateMode) {
      // Template mode: single-select (radio), allow deselect by clicking the same app
      this.filteredApps$.pipe(take(1)).subscribe(apps => {
        const wasSelected = app.isSelected;
        apps.forEach(a => a.isSelected = false);
        if (!wasSelected) {
          app.isSelected = true;
          this.selectedApp$.next(app);
        } else {
          this.selectedApp$.next(null);
        }
      });
    } else {
      // Installer mode: multi-select; reset forced-allSelected for individual toggles
      this.allSelected$.next({ selected: false, forced: false });
      app.isSelected = !app.isSelected;
      this.selectedApp$.next(app);
    }
  }

  // Send selected apps to the parent window for installation
  postSelectedAppsToParent() {
    const appsToInstall = this.selectedApps.map(data => ({
      displayName: data.displayName,
      url: data.downloadUrl,
    }));

    const message = {
      action: "install",
      moduleId: this.moduleId,
      packages: appsToInstall,
    };
    window.parent.postMessage(JSON.stringify(message), "*");
  }

  // Toggles all app selections (used for "select all" checkbox)
  toggleAllAppsSelection(selectAll: boolean) {
    this.allSelected$.next({ selected: selectAll, forced: true });
  }

  // Switch between list and tile view modes
  changeViewMode(mode: ViewModes) {
    this.currentViewMode = mode;
  }

  // Handles creating an app with or without a template, sends info to parent
  createAppWithOrWithoutTemplate(hasTemplate: boolean) {
    const templateApps = this.selectedApps.map(data => ({
      displayName: data.displayName,
      url: data.downloadUrl,
    }));
    console.log("createAppWithOrWithoutTemplate", hasTemplate, templateApps);

    // Optionally send info to parent window
    // const message = {
    //   action: "template",
    //   moduleId: this.moduleId,
    //   packages: templateApps,
    // };
    // window.parent.postMessage(JSON.stringify(message), "*");
  }

  // TrackBy function for ngFor in template
  trackApp(index: number, app: App) { return app.urlKey; }
}