// declare enum ButtonBehaviorType {
//   "play",
//   "getSounds",
// }

// declare enum PageType {
//   first = "first",
//   last = "last",
// }

declare type ButtonBehaviorType = "play" | "getSounds";
declare type PageType = "first" | "last";

declare interface ButtonBehaviorData {
  type: ButtonBehaviorType;
}

// declare interface PlayButtonBehaviorData extends ButtonBehavioData{
//   id: number
// }

declare interface PlayButtonBehaviorData extends ButtonBehaviorData {
  type: "play";
  id: number;
}

declare interface GetSoundsBehaviorData extends ButtonBehaviorData {
  type: "getSounds";
  page: number | PageType;
  userId?: string;
  cursor?: number;
  isFirst?: boolean;
  isPrevious?: boolean;
  isNext?: boolean;
  isLast?: boolean;
}

// declare interface ButtonBehaviorData {
//   type: ButtonBehaviorType;
// }

// declare interface PlayButtonBehaviorData extends ButtonBehaviorData {
//   type: ButtonBehaviorType.play;
//   id: number;
// }

// declare interface GetSoundsBehaviorData extends ButtonBehaviorData {
//   type: ButtonBehaviorType.getSounds;
//   page: number | PageType;
//   userId?: string;
//   cursor?: number;
// }
