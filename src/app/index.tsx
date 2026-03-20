import { Frame } from "~/src/frame";
import styles from "./style.module.css";

const ticketEvents = [
  { name: "MEGA MAALAI BALL", url: "https://tickets.megamaalai.org" },
  { name: "MEGA MAALAI SHOWDAY", url: "https://tickets.megamaalai.org" },
  { name: "MEGA MAALAI SHOWDOWN", url: "https://tickets.megamaalai.org" },
  {
    name: "MEGA MAALAI BRUNCH",
    note: "Will be hosted if there is enough signups",
    url: "https://tickets.megamaalai.org",
  },
];

export function App() {
  return (
    <>
      <Frame />
      <main className={styles.ticketsPage}>
        <section className={styles.ticketsCard} aria-label="Tickets">
          <h2 className={styles.heading}>Events & Tickets</h2>
          <div className={styles.ticketList}>
            {ticketEvents.map((event) => (
              <a
                key={event.name}
                className={styles.ticketLink}
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.eventName}>{event.name}</span>
                {event.note ? <span className={styles.eventNote}>{event.note}</span> : null}
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
