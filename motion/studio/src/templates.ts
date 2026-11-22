import type { BaseData, Template } from "../../engine";
import { cardJourney } from "../../templates/card-journey";
import { photoCaption } from "../../templates/photo-caption";
import { photoMosaic } from "../../templates/photo-mosaic";
import { siteRequestCard } from "../../templates/site-request-card";
import { sortFlash } from "../../templates/sort-flash";
import { titleCard } from "../../templates/title-card";
import { wordRoll } from "../../templates/word-roll";

/** Every composition type the studio can make. Add new templates here and in templates/specs.ts. */
export const TEMPLATES: Template<BaseData>[] = [titleCard, sortFlash, wordRoll, photoCaption, photoMosaic, cardJourney, siteRequestCard] as unknown as Template<BaseData>[];

export function templateById(id: string) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
