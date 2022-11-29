import { Component, ElementRef } from '@angular/core';
import { SxcAppComponent, Context } from '@2sic.com/sxc-angular';
import { APPS } from "./mock-up"
import { Apps } from './app-interface';
import { BehaviorSubject, combineLatest, delay, map, Observable, of, tap } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent extends SxcAppComponent {
  constructor(el: ElementRef, context: Context) {
    super(el, context);
  }

  apps$!: Observable<Apps[]>;
  selectedApps!: BehaviorSubject<Apps[]>;

  selectedAppsArr : Apps[] = [];

  isTilesView: boolean = true;

  private isAllSelected!: BehaviorSubject<boolean>;

  ngOnInit(): void {
    this.isAllSelected = new BehaviorSubject(true);
    this.selectedApps = new BehaviorSubject([]);

    this.apps$ = combineLatest(of(APPS), this.isAllSelected).pipe(
      map(([apps, allSelected]) => {
        this.selectedAppsArr = [];

        apps.forEach(app => {
          app.isSelected = allSelected;

          if(app.isSelected) {
            this.selectedAppsArr.push(app)
          }
        });

        return apps;
      }),
      delay(0),
      tap(() => {
        this.selectedApps.next(this.selectedAppsArr);
      })
    )
  }

  changeValue(app: Apps, urlKey: string) {
    const found = this.selectedAppsArr.some((app : Apps) => app.urlKey == urlKey);

    if (!found) {
      this.selectedAppsArr.push(app)
    } else {
      const indexOfApps = this.selectedAppsArr.findIndex((app: Apps) => {
        return app.urlKey === urlKey;
      });

      this.selectedAppsArr.splice(indexOfApps, 1);
    }

    this.selectedApps.next(this.selectedAppsArr)
  }

  installApps() {
    var message = { 'action': 'install', 'moduleId': 'window.ModuleId', 'packages': this.selectedAppsArr};
    window.parent.postMessage(JSON.stringify(message), '*');
  }

  toggleSelection(val: boolean) {
    this.isAllSelected.next(val);
  }

  toggleView() {
    this.isTilesView = !this.isTilesView;
  }

}


