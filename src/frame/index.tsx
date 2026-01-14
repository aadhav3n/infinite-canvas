import styles from "./style.module.css";

export function Frame() {
  return (
    <header className={`frame ${styles.frame}`}>
      <div className={styles.frame__draggable}>
        THIS SITE IS DRAGGABLE
      </div>
      <div className={styles.frame__titleContainer}>
        <h1 className={styles.frame__title}>MEGA MAALAI</h1>
        <p className={styles.frame__subtitle}>32 years in the making</p>
      </div>
      <a className={styles.frame__home} href="https://home.megamaalai.org">
        HOME.MEGAMAALAI.ORG
      </a>
      <a className={styles.frame__timeline} href="https://timeline.megamaalai.org">
        TIMELINE.MEGAMAALAI.ORG
      </a>
      <a className={styles.frame__teams} href="https://teams.megamaalai.org">
        TEAMS.MEGAMAALAI.ORG
      </a>
      <a className={styles.frame__tickets} href="https://tickets.megamaalai.org">
        TICKETS.MEGAMAALAI.ORG
      </a>
      <a className={styles.frame__contact} href="https://www.instagram.com/megamaalai/" target="_blank" rel="noopener noreferrer">
        @MEGAMAALAI ON INSTAGRAM OR TAMIL@IC.AC.UK
      </a>
      <div className={styles.frame__credits}>
        <span>By inhouse</span>
      </div>
      <nav className={styles.frame__tags}>
        <a href="https://www.instagram.com/explore/tags/megamaalai/" target="_blank" rel="noopener noreferrer">
          #megamaalai
        </a>
        <a href="https://www.instagram.com/explore/tags/mm26/" target="_blank" rel="noopener noreferrer">
          #mm26
        </a>
        <a href="https://www.instagram.com/explore/tags/imperialtsoc/" target="_blank" rel="noopener noreferrer">
          #imperialtsoc
        </a>
      </nav>
    </header>
  );
}
