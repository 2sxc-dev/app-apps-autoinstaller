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
import { FormControl, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { environment } from "../environments/environment";
import { HeaderComponent } from "./header/header.component";
import { ButtonInstallerComponent } from "./button-installer/button-installer.component";
import { ButtonTemplateComponent } from "./button-template/button-template.component";
import { MatIconModule } from "@angular/material/icon";
import { AsyncPipe } from "@angular/common";

// Enum für die View-Modi
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

  ViewModes = ViewModes;

  // ------ Properties ------
  baseUrl: string = environment.baseUrl;

  /** Observable mit allen Apps, gefiltert nach Regeln */
  filteredApps$!: Observable<App[]>;
  /** Observable mit Apps, die nach Suche und Checkbox-Status gefiltert sind */
  displayApps$!: Observable<App[]>;

  /** Regeln für App-Auswahl */
  sxcRules$ = new BehaviorSubject<Rules[]>([]);
  /** Suchbegriff */
  searchTerm$ = new BehaviorSubject<string>("");
  /** Zustand der "Alle auswählen"-Checkbox */
  allSelected$ = new BehaviorSubject<Selected>({ selected: false, forced: true });
  /** Aktuell selektierte App (für Single-Select oder Details) */
  selectedApp$ = new BehaviorSubject<App>({} as App);
  /** Liste der aktuell markierten Apps */
  selectedApps: App[] = [];
  /** Formular-Control für die Suche */
  searchControl = new FormControl();

  /** Anzahl zu selektierender Apps (für UI) */
  numAppsToSelect: number = 0;
  /** Anzahl zu deselektierender Apps (für UI) */
  numAppsToUnselect: number = 0;
  /** Aktueller View-Mode */
  currentViewMode: ViewModes = ViewModes.Tiles;

  // URL-Parameter
  params = new URLSearchParams(window.location.search);
  sxcVersion = this.params.get("sxcversion");
  sysVersion = this.params.get("sysversion");
  sexyContentVersion = this.params.get("2SexyContentVersion");
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

  // ------ HostListener für Nachrichten vom Parent (z.B. Regeln neu setzen) ------
  @HostListener("window:message", ["$event"])
  onPostMessage(event: MessageEvent) {
    if (typeof event.data !== "string") return;
    const message = JSON.parse(event.data);

    // Regeln vom Parent erhalten
    if (message.action === "specs" && message.data?.rules) {
      this.sxcRules$.next(message.data.rules);
    }
  }

  // ------ Lifecycle ------
  ngOnInit(): void {
    this.sendSpecsRequestToParent();
    this.initParamsFromUrl();
    this.setupSearchControl();
    this.setupFilteredAppsStream();
    this.setupDisplayAppsStream();
  }

  /** Sende Specs-Request an Parent (z.B. für Regeln) */
  private sendSpecsRequestToParent() {
    const message = { action: "specs", moduleId: this.moduleId };
    window.parent.postMessage(JSON.stringify(message), "*");
  }

  /** Lese Parameter aus der URL und setze Flags */
  private initParamsFromUrl() {
    this.hasUrlParams =
      this.params.has("sysversion") &&
      this.params.has("sxcversion") &&
      this.params.has("2SexyContentVersion");

    this.isTemplateMode = this.params.has("isTemplate");

    // Wenn nicht Template-Modus, alle Apps vorselektieren
    if (!this.isTemplateMode) {
      this.allSelected$.next({ selected: true, forced: true });
    }
  }

  // Setup für das Suchfeld 
  private setupSearchControl() {
    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe((value) => {
      this.searchTerm$.next(value ?? "");
    });
  }

  /** Setup: Apps vom Service laden und nach Regeln filtern */
  private setupFilteredAppsStream() {
    const queryType = this.isTemplateMode ? "TemplateList" : "AutoInstaller";
    this.filteredApps$ = this.dataService
      .getApps(
        this.sxcVersion,
        this.sysVersion,
        this.sexyContentVersion,
        this.moduleId,
        queryType
      )
      .pipe(
        combineLatestWith(this.sxcRules$),
        map(([apps, rules]) => this.applyRulesToApps(apps, rules))
      );
  }

  /** Setup: Apps für die Anzeige nach Suchbegriff und Checkbox-Status filtern */
  private setupDisplayAppsStream() {
    this.displayApps$ = this.filteredApps$.pipe(
      combineLatestWith(
        this.allSelected$,
        this.searchTerm$,
        this.selectedApp$
      ),
      map(([apps, allSelected, searchTerm, selectedApp]) => {
        const filteredApps = this.filterAppsBySearch(apps, searchTerm);
        this.updateAppSelection(filteredApps, allSelected);
        this.updateSelectionCounts(filteredApps);

        return filteredApps;
      }),
      share()
    );
  }

  /** Filtert Apps basierend auf den aktuellen Regeln */
  private applyRulesToApps(apps: App[], rules: Rules[]): App[] {
    if (apps.length === 0) return [];


    this.recommendedAppsTitle = "Recommended Apps for";

    // Prüfe, ob alle Apps per Regel verboten wurden
    const allForbidden = rules.some(rule =>
      rule.mode === "f" && rule.target === "all"
    );

    if (allForbidden) {
      // Nur explizit erlaubte Apps anzeigen
      const allowed = apps.filter(app =>
        rules.some(rule =>
          rule.mode === "a" &&
          rule.target === "guid" &&
          rule.appGuid === app.guid
        )
      );
      return allowed.length > 0 ? allowed : [];
    }

    // Apps, die explizit verboten sind
    const forbiddenApps = apps.filter(app =>
      rules.some(rule =>
        rule.mode === "f" &&
        rule.target === "guid" &&
        rule.appGuid === app.guid
      )
    );
    // Alle übrigen Apps sind erlaubt
    const allowedApps = apps.filter(app => !forbiddenApps.includes(app));
    // Optional-Apps werden nicht selektiert, alle anderen schon
    allowedApps.forEach(app => {
      const isOptional = rules.some(rule =>
        rule.mode === "o" &&
        rule.target === "guid" &&
        rule.appGuid === app.guid
      );
      app.isSelected = !isOptional;
    });
    // Alphabetisch sortieren
    allowedApps.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return allowedApps;
  }

  /** Filtert Apps nach Suchbegriff */
  private filterAppsBySearch(apps: App[], searchTerm: string): App[] {
    if (!searchTerm) return apps;
    return apps.filter(app =>
      app.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /** Setzt die Auswahl-Checkboxen je nach "Alle auswählen"-Status */
  private updateAppSelection(apps: App[], allSelected: Selected) {
    apps.forEach(app => {
      app.isSelected = allSelected.forced
        ? allSelected.selected
        : app.isSelected;
    });
  }

  /** Aktualisiert Zähler für selektierte und nicht selektierte Apps */
  private updateSelectionCounts(apps: App[]) {
    this.selectedApps = apps.filter(app => app.isSelected);
    this.numAppsToUnselect = this.selectedApps.length;
    this.numAppsToSelect = apps.length - this.numAppsToUnselect;
  }

  // ------ Event-Handler ------

  /** Checkbox für ein App-Element toggeln */
  onAppCheckboxToggle(tagName: string, app: App): void {
    if (tagName === "A" || tagName === "MAT-ICON") return;

    if (this.isTemplateMode) {
      // Im Template-Modus: Multi-Select
      this.allSelected$.next({ selected: false, forced: true });
      this.allSelected$.next({ selected: true, forced: false });
      app.isSelected = !app.isSelected;
      this.selectedApp$.next(app);
    } else {
      // Im Installer-Modus: Multi-Select
      this.allSelected$.next({ selected: true, forced: false });
      app.isSelected = !app.isSelected;
      this.selectedApp$.next(app);
    }
  }

  /** Sende die aktuell ausgewählten Apps an das Parent-Fenster */
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

  /** Toggle für "Alle Apps auswählen" */
  toggleAllAppsSelection(selectAll: boolean) {
    this.allSelected$.next({ selected: selectAll, forced: true });
  }

  /** Wechsel zwischen Listen- und Kachelansicht */
  changeViewMode(mode: ViewModes) {
    this.currentViewMode = mode;
  }

  /** (Optional) Neue App mit oder ohne Template erstellen */
  createAppWithOrWithoutTemplate(hasTemplate: boolean) {
    const templateApps = this.selectedApps.map(data => ({
      displayName: data.displayName,
      url: data.downloadUrl,
    }));
    console.log("createAppWithOrWithoutTemplate", hasTemplate, templateApps);

    // Optional: Nachricht ans Parent senden
    // const message = {
    //   action: "template",
    //   moduleId: this.moduleId,
    //   packages: templateApps,
    // };
    // window.parent.postMessage(JSON.stringify(message), "*");
  }
}