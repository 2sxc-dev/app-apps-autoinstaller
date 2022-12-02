import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'Search'
})
export class SearchPipe implements PipeTransform {

  transform(data: any, searchValue?: any): any {
    return data.filter((item: any) => {
      return item.displayName.toLocaleLowerCase().includes(searchValue.toLowerCase());
    })
  }

}
