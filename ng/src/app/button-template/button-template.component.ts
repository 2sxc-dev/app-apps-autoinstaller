import { Component, input, output } from '@angular/core';
import { App } from '../app-interface';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-button-template',
  templateUrl: './button-template.component.html',
  styleUrl: './button-template.component.scss',
  standalone: true,
  imports: [MatButtonModule],
})
export class ButtonTemplateComponent {
  selectTemplate = input.required<App[]>();
  createNewApp = output<boolean>();


  createAppWithOrWithoutTemplate(hasTemplate: boolean) {
    this.createNewApp.emit(hasTemplate);
  }

}
