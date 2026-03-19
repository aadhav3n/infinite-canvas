import * as React from "react";
import styles from "./style.module.css";

const LINKEDIN_URL = "https://www.linkedin.com/in/aadhav3n/";

export function CreditsCorner() {
  // The displayed handle toggles between `a` and `3`, matching the requested `a -> 3` style.
  const [useThree, setUseThree] = React.useState(false);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setUseThree((prev) => !prev);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleChar = useThree ? "3" : "a";

  return (
    <a
      className={styles.creditsCorner}
      href={LINKEDIN_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Credits link to LinkedIn"
    >
      CREDITS by aadhav
      <span key={handleChar} className={styles.char}>
        {handleChar}
      </span>
      n
    </a>
  );
}

