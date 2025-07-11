import { Component, ElementRef, HostListener } from "@angular/core";
import { SxcAppComponent, Context } from "@2sic.com/sxc-angular";
import { App, Rules } from "./app-interface";
import {
  BehaviorSubject,
  combineLatestWith,
  debounceTime,
  map,
  Observable,
  shareReplay,
  take,
} from "rxjs";
import { DataService } from "./services/data.service";
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { environment } from "../environments/environment";
import { HeaderComponent } from "./header/header.component";
import { ButtonInstallerComponent } from "./button-installer/button-installer.component";
import { MatIconModule } from "@angular/material/icon";
import { AsyncPipe } from "@angular/common";
import { MatTooltipModule } from '@angular/material/tooltip';

// Define enum for switching between tile and list view modes
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
    MatIconModule,
    AsyncPipe,
    ReactiveFormsModule,
    FormsModule,
    MatTooltipModule,
  ],
})
export class AppComponent extends SxcAppComponent {

  versionInfo = "2sxc App Installer v01.00.01";
  // For template use - expose enum
  ViewModes = ViewModes;
  // Base URL for API calls or navigation
  baseUrl: string = environment.baseUrl;

  // Observable for all apps, after rules are applied
  filteredApps$!: Observable<App[]>;
  // Observable for apps currently displayed in the UI (filtered by search)
  displayApps$!: Observable<App[]>;

  // State management: rules, search term, selection, etc.
  sxcRules$ = new BehaviorSubject<Rules[]>([]);
  searchTerm$ = new BehaviorSubject<string>("");
  selectedApp$ = new BehaviorSubject<App | null>(null); // For single-select (template mode)
  selectedApps: App[] = []; // Array of all currently selected apps
  searchControl = new FormControl(); // For binding search input

  // Counter for UI: number of selected/unselected in current view
  numAppsToSelect: number = 0;
  numAppsToUnselect: number = 0;
  // Current view mode (tiles or list)
  currentViewMode: ViewModes = ViewModes.Tiles;

  // URL parameters & flags for initial state
  params = new URLSearchParams(window.location.search);
  moduleId = this.params.get("ModuleId");
  hasUrlParams = true;
  isTemplateMode = false;

  // Title for "recommended apps" section
  sxcversion: string = this.params.get("sxcversion");

  constructor(
    el: ElementRef,
    context: Context,
    private dataService: DataService
  ) {
    super(el, context);
  }

  // Listen for postMessage events from parent window (for receiving rules)
  @HostListener("window:message", ["$event"])
  onPostMessage(event: MessageEvent) {
    if (typeof event.data !== "string") return;
    const message = JSON.parse(event.data);
    // Update rules if received from parent frame
    if (message.action === "specs" && message.data?.rules) {
      this.sxcRules$.next(message.data.rules);
    }
  }

  // Initial setup when component mounts
  ngOnInit(): void {
    this.sendSpecsRequestToParent();
    this.initParamsFromUrl();
    this.setupSearchControl();
    this.setupFilteredAppsStream();
    this.setupDisplayAppsStream();
  }

  // Request rules/specs from parent window (iframe usage)
  private sendSpecsRequestToParent() {
    const message = { action: "specs", moduleId: this.moduleId };
    window.parent.postMessage(JSON.stringify(message), "*");
  }

  // Parse URL parameters and set initial state flags
  private initParamsFromUrl() {
    this.hasUrlParams =
      this.params.has("sysversion") &&
      this.params.has("sxcversion") &&
      this.params.has("2SexyContentVersion")

    console.log(this.params.get("sxcversion"))

    this.isTemplateMode = this.params.get("isTemplate") === 'true';
  }

  // Listen to search field and update searchTerm$ state, debounced
  private setupSearchControl() {
    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.searchTerm$.next(value ?? "");
    });
  }

  // Get and filter apps from API, apply rules, emit as observable
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
        map(([apps, rules]) => this.applyRulesToApps(apps, rules)),
        shareReplay(1) // Share result for all subscribers
      );
  }

  // Computes the array of apps to display, after search, selection, etc.
  private setupDisplayAppsStream() {
    this.displayApps$ = this.filteredApps$.pipe(
      combineLatestWith(this.searchTerm$, this.selectedApp$),
      map(([apps, searchTerm, selectedApp]) => {
        const filteredApps = this.filterAppsBySearch(apps, searchTerm);

        // Template mode: only one app can be selected at a time (radio behavior)
        if (this.isTemplateMode) {
          let selectedKey = selectedApp && selectedApp.urlKey ? selectedApp.urlKey : null;
          filteredApps.forEach(app => app.isSelected = (app.urlKey === selectedKey));
        }

        // Update UI counters and currently selected apps
        this.selectedApps = apps.filter(app => app.isSelected);
        this.numAppsToUnselect = filteredApps.filter(app => app.isSelected).length;
        this.numAppsToSelect = filteredApps.length - this.numAppsToUnselect;
        return filteredApps;
      }),
      shareReplay(1)
    );
  }

  // Apply allow/forbid/optional rules to apps from backend
  private applyRulesToApps(apps: App[], rules: Rules[]): App[] {
    if (apps.length === 0) return [];
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
    // Otherwise: exclude forbidden, select all not-optional by default
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

  // Filter apps by search term (case-insensitive)
  private filterAppsBySearch(apps: App[], searchTerm: string): App[] {
    if (!searchTerm) return apps;
    return apps.filter(app =>
      app.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Handle checkbox toggle for app selection.
   * - In template mode: only one can be selected (radio).
   * - In installer mode: multi-select, toggles individual app.
   */
  onAppCheckboxToggle(tagName: string, app: App): void {
    if (tagName === "A" || tagName === "MAT-ICON") return;
    if (this.isTemplateMode) {
      // Radio behavior: only one app can be selected
      this.filteredApps$.pipe(take(1)).subscribe(apps => {
        const wasSelected = app.isSelected;
        apps.forEach(a => a.isSelected = false);
        if (!wasSelected) {
          app.isSelected = true;
          this.selectedApp$.next(app);
        } else {
          this.selectedApp$.next(null);
        }

        this.createAppWithOrWithoutTemplate(app.isSelected);

      });
    } else {
      // Multi-select: toggle the selected state
      app.isSelected = !app.isSelected;
      this.selectedApp$.next(app);
    }
  }

  /**
   * Toggle selection state for all currently visible apps (based on search/filter).
   * Only apps present in the current search result will be selected/deselected.
   */
  toggleAllAppsSelection(selectAll: boolean) {
    this.displayApps$.pipe(take(1)).subscribe(displayedApps => {
      displayedApps.forEach(app => app.isSelected = selectAll);
      // Optionally update counters immediately
      this.filteredApps$.pipe(take(1)).subscribe(allApps => {
        this.selectedApps = allApps.filter(app => app.isSelected);
        this.numAppsToUnselect = displayedApps.filter(app => app.isSelected).length;
        this.numAppsToSelect = displayedApps.length - this.numAppsToUnselect;
      });
    });
  }

  // Send selected apps to parent window (for installation)
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

  // Switch between tile and list views
  changeViewMode(mode: ViewModes) {
    this.currentViewMode = mode;
  }

  // Handler for creating an app with/without template (informational/logging)
  createAppWithOrWithoutTemplate(hasTemplate: boolean) {
    const templateApp = this.selectedApps.map(data => ({
      displayName: data.displayName,
      url: data.downloadUrl,
    }));
    const message = {
      action: "template",
      moduleId: this.moduleId,
      packages: templateApp,
    };
    window.parent.postMessage(JSON.stringify(message), "*");
    console.log("createAppWithOrWithoutTemplate", templateApp);
  }

}