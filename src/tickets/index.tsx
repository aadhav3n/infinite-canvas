import styles from "./style.module.css";

type TicketEvent = {
  name: string;
  ticketUrl: string;
  note?: string;
};

const EVENTS: TicketEvent[] = [
  {
    name: "MEGA MAALAI BALL",
    ticketUrl: "https://tickets.megamaalai.org/ball",
  },
  {
    name: "MEGA MAALAI SHOWDAY",
    ticketUrl: "https://tickets.megamaalai.org/showday",
  },
  {
    name: "MEGA MAALAI SHOWDOWN",
    ticketUrl: "https://tickets.megamaalai.org/showdown",
  },
  {
    name: "MEGA MAALAI BRUNCH?",
    ticketUrl: "https://tickets.megamaalai.org/brunch",
    note: "WILL BE HOSTED IF THERE IS ENOUGH SIGNUPS",
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
