import * as React from "react";
import styles from "./style.module.css";

export function Frame() {
  const [contactText, setContactText] = React.useState("CONTACT");
  const [isFading, setIsFading] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setContactText((prev) => (prev === "CONTACT" ? "SPONSOR" : "CONTACT"));
        setIsFading(false);
      }, 500);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className={`frame ${styles.frame}`}>
      <div className={styles.frame__titleContainer}>
        <a className={styles.frame__titleLink} href="https://home.megamaalai.org">
          <h1 className={styles.frame__title}>MEGA MAALAI</h1>
        </a>
        <p className={styles.frame__subtitle}>32 years in the making</p>
      </div>
      <nav className={styles.frame__nav}>
        <a className={styles.frame__home} href="https://home.megamaalai.org">
          HOME
        </a>
        <a className={styles.frame__timeline} href="https://timeline.megamaalai.org">
          TIMELINE
        </a>
        <a className={styles.frame__tickets} href="https://tickets.megamaalai.org">
          TICKETS
        </a>
        <a 
          className={`${styles.frame__contact} ${isFading ? styles.fading : ""}`} 
          href="https://www.instagram.com/megamaalai/" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          {contactText}
        </a>
      </nav>
      <div className={styles.frame__bottom}>
        <nav className={styles.frame__tags}>
          <a href="https://imperialtsoc.org" target="_blank" rel="noopener noreferrer">
            RETURN TO IMPERIALTSOC
          </a>
        </nav>
      </div>
    </header>
  );
}
