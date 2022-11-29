import { Component, ElementRef } from '@angular/core';
import { SxcAppComponent, Context } from '@2sic.com/sxc-angular';
import { APPS } from "./mock-up"
import { Apps } from './app-interface';
import { BehaviorSubject, combineLatest, filter, map, Observable, of, share, shareReplay, tap } from 'rxjs';

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
  selectedApps : Apps[] = [];
  // selectedAppLength : string = "";

  private allSelected!: BehaviorSubject<boolean>;

  ngOnInit(): void {
    this.allSelected = new BehaviorSubject(true);

    this.apps$ = combineLatest(of(APPS), this.allSelected).pipe(
      map(([apps, allSelected]) => {
        this.selectedApps = [];

        apps.forEach(app => {
          app.isSelected = allSelected;

          if(app.isSelected) {
            this.selectedApps.push(app)
          }
        });

        // this.selectedAppLength = this.selectedApps.length.toLocaleString();

        return apps;
      }),
      tap(() => console.log('trigger'))
    )
  }

  changeValue(app: Apps, urlKey: string) {
    const found = this.selectedApps.some((app : Apps) => app.urlKey == urlKey);

    if (!found) {
      this.selectedApps.push(app)
    } else {
      const indexOfApps = this.selectedApps.findIndex((app: Apps) => {
        return app.urlKey === urlKey;
      });

      this.selectedApps.splice(indexOfApps, 1);
    }

    // this.selectedAppLength = this.selectedApps.length.toLocaleString();
  }

  selectAll(val: boolean) {
    this.allSelected.next(val);
  }

  installApps() {


console.log( this.selectedApps)
  }


}


