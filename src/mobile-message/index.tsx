import * as React from "react";
import styles from "./style.module.css";

export function MobileMessage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.message}>this is only viewable on desktop</p>
        <a href="https://home.megamaalai.org" className={styles.link}>
          home.megamaalai.org
        </a>
      </div>
    </div>
  );
}

