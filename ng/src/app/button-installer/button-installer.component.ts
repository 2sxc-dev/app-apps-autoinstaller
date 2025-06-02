import { Component, input, output } from '@angular/core';
import { App } from '../app-interface';

@Component({
  selector: 'app-button-installer',
  templateUrl: './button-installer.component.html',
  styleUrl: './button-installer.component.scss',
  standalone: true,
})
export class ButtonInstallerComponent {
  selectedApps = input.required<App[]>();
  unselectedAppsCount = input.required<number>();
  selectableAppsCount = input.required<number>();

  installSelectedApps = output<void>();
  selectionToggled = output<boolean>();


  onInstallClicked() {
    this.installSelectedApps.emit();
  }

  onSelectionToggle(value: boolean) {
    this.selectionToggled.emit(value);
  }

}

