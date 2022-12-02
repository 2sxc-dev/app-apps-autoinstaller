import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'Search'
})
export class SearchPipe implements PipeTransform {

  transform(value: any, args?:any): any {

    args = args.toLowerCase()

    return value.filter((item: any) =>{
      return JSON.stringify(item).toLocaleLowerCase().includes(args);
    } )
  }

}
