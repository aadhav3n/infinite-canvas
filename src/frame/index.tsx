import styles from "./style.module.css";

export function Frame() {
  return (
    <header className={styles.frame}>
      <h1 className={styles.frame__title}>Infinite Canvas</h1>
      <a className={styles.frame__back} href="https://tympanus.net/codrops/?p=106679">
        Article
      </a>
      <a className={styles.frame__archive} href="https://tympanus.net/codrops/hub/">
        All demos
      </a>
      <a className={styles.frame__github} href="https://github.com/edoardolunardi/infinite-canvas">
        GitHub
      </a>
      <nav className={styles.frame__tags}>
        <a href="https://tympanus.net/codrops/demos/?tag=scroll">#scroll</a>
        <a href="https://tympanus.net/codrops/demos/?tag=three-js">#three.js</a>
        <a href="https://tympanus.net/codrops/demos/?tag=webgl">#webgl</a>
      </nav>
    </header>
  );
}
