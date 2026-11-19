import styles from "./Stagger.module.css";

/** Default level of each word in turn (1 = a line up, -1 = a line down), repeating. */
export const WAVE = [0, 1, 0, -1];

/** Levels as editors type them in Sanity ("0,1,0,-1") -> numbers; empty or invalid -> undefined (the default wave). */
export const parseLevels = (v?: string | null) => v?.split(",").map(Number).filter((n) => !Number.isNaN(n));

/**
 * Words set on three levels in a wave, each starting where the one before it ends:
 * middle, up, middle, down, repeating ("More" / "life," up / "less" / "admin" down). Screen readers get the plain sentence.
 * Size and colour come from the parent; the step between levels is one line.
 * Inside a Reveal, the words come in one at a time when it scrolls into view.
 */
export default function Stagger({ text, levels = WAVE, className = "" }: {
  text: string;
  /** Level per word, repeating if there are more words than levels. */
  levels?: number[];
  className?: string;
}) {
  const lv = levels.length ? levels : WAVE;
  const words = text.trim().split(/\s+/);
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span className={`${styles.stagger} ${className}`} aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} className={styles.word} style={{ ["--i" as string]: i, ["--level" as string]: lv[i % lv.length] }}>{w}</span>
        ))}
      </span>
    </>
  );
}
