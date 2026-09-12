import { tickerItems } from '@/lib/club';
import { formatTime } from '@/lib/time';
import type { WeeklySession } from '@/types';

function TickerList({ items }: { items: string[] }) {
  return (
    <ul className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="display flex shrink-0 items-center gap-10 whitespace-nowrap text-lg text-white/85 sm:text-2xl"
        >
          {item}
          <span className="text-green-bright">●</span>
        </li>
      ))}
    </ul>
  );
}

/** Dark scrolling marquee — two identical tracks so the loop is seamless. */
export function Ticker({ schedule }: { schedule: WeeklySession[] }) {
  const items = tickerItems(schedule, formatTime);

  return (
    <div className="dark-section relative overflow-hidden border-y border-white/10 py-4">
      <div className="mask-fade-x" aria-hidden="true">
        <div className="flex w-max animate-marquee">
          <TickerList items={items} />
          <TickerList items={items} />
        </div>
      </div>
      <p className="sr-only">
        Weekly sessions: {items.join('. ')}.
      </p>
    </div>
  );
}
