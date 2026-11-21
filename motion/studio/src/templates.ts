import type { BaseData, Template } from "../../engine";
import { cardJourney } from "../../templates/card-journey";
import { sortFlash } from "../../templates/sort-flash";

/** Every composition type the studio can make. Add new templates here. */
export const TEMPLATES: Template<BaseData>[] = [sortFlash, cardJourney] as unknown as Template<BaseData>[];

export function templateById(id: string) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}
