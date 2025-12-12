import { Component, input } from "@angular/core";

@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.scss",
  standalone: true,
})
export class HeaderComponent {
  title = input.required<string>();
  description = input.required<string>();
  strongText = input.required<string>();
}
