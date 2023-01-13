export interface App {
  downloadUrl: string;
  url: string;
  displayName: string;
  icon: string;
  version?: string;
  gitHub: string;
  urlKey: string;
  shortDescription: string;
  isSelected?: boolean;
  minDnn: string;
  min2Sxc: string;
  minOqt: string;
}

export interface Rules {
  name: string;
  appGuid: string;
  mode: string;
  target: string;
  url: string;
}

export interface Selected {
  selected: boolean,
  forced: boolean
}
