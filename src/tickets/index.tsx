import styles from "./style.module.css";

type TicketEvent = {
  name: string;
  ticketUrl: string;
  note?: string;
};

const EVENTS: TicketEvent[] = [
  {
    name: "MM BALL",
    ticketUrl: "https://tickets.megamaalai.org/mmball",
  },
  {
    name: "MM SHOWDAY",
    ticketUrl: "https://tickets.megamaalai.org/showday",
  },
  {
    name: "MM SHOWDOWN",
    ticketUrl: "https://tickets.megamaalai.org/showdown",
  },
  {
    name: "MM BRUNCHTIME",
    ticketUrl: "https://tickets.megamaalai.org/brunchtime",
  },
];

export function TicketsPage() {
  return (
    <main className={styles.ticketsPage}>
      <section className={styles.content}>
        <h2 className={styles.heading}>Tickets</h2>
        <p className={styles.subheading}>Select an event to get your tickets.</p>
        <ul className={styles.eventList}>
          {EVENTS.map((event) => (
            <li key={event.name} className={styles.eventCard}>
              <div className={styles.eventText}>
                <h3 className={styles.eventName}>{event.name}</h3>
                {event.note ? <p className={styles.eventNote}>{event.note}</p> : null}
              </div>
              <a
                className={styles.ticketButton}
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Tickets
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
