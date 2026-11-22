// The template files (controls + defaults) for everything the studio can make.
// Read by the Sanity schema and the guide on the site, which don't need the drawing code.
import cardJourney from "./card-journey/template.json";
import photoCaption from "./photo-caption/template.json";
import photoMosaic from "./photo-mosaic/template.json";
import sortFlash from "./sort-flash/template.json";
import titleCard from "./title-card/template.json";
import wordRoll from "./word-roll/template.json";

export const TEMPLATE_SPECS = [titleCard, sortFlash, wordRoll, photoCaption, photoMosaic, cardJourney];
