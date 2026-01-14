import styles from "./style.module.css";

export function Frame() {
  return (
    <header className={`frame ${styles.frame}`}>
      <div className={styles.frame__draggable}>THIS SITE IS DRAGGABLE</div>
      <div className={styles.frame__titleContainer}>
        <h1 className={styles.frame__title}>MEGA MAALAI</h1>
        <p className={styles.frame__subtitle}>32 years in the making</p>
      </div>
      <a className={styles.frame__home} href="https://home.megamaalai.org">
        HOME
      </a>
      <a className={styles.frame__timeline} href="https://timeline.megamaalai.org">
        TIMELINE
      </a>
      <a className={styles.frame__tickets} href="https://tickets.megamaalai.org">
        TICKETS
      </a>
      <a className={styles.frame__contact} href="https://www.instagram.com/megamaalai/" target="_blank" rel="noopener noreferrer">
        CONTACT
      </a>
      <div className={styles.frame__credits}>
        <span>By inhouse :)</span>
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
