import { Component, input, output } from "@angular/core";
import { App } from "../app-interface";
import { MatButtonModule } from "@angular/material/button";
import { AppViewMode } from "../app.component";

@Component({
  selector: "app-button-installer",
  templateUrl: "./button-installer.component.html",
  styleUrl: "./button-installer.component.scss",
  imports: [MatButtonModule],
  standalone: true,
})
export class ButtonInstallerComponent {
  selectedApps = input.required<App[]>();
  selectOnlyOneApp = input.required<boolean>();
  unselectedAppsCount = input.required<number>();
  selectableAppsCount = input.required<number>();
  appViewMode = input.required<AppViewMode>();

  installSelectedApps = output<void>();
  selectionToggled = output<boolean>();

  onInstallClicked() {
    this.installSelectedApps.emit();
  }

  onSelectionToggle(value: boolean) {
    this.selectionToggled.emit(value);
  }

  // Button-Text dynamisch je nach Modus
  getInstallButtonText(): string {
    if (this.selectOnlyOneApp) {
      return this.appViewMode() === AppViewMode.Templates
        ? "Install selected app as Template"
        : this.appViewMode() === AppViewMode.Extensions
        ? "Install selected extension"
        : "Install selected app";
    }
    return `Install selected ${this.selectedApps.length} apps`;
  }
}
