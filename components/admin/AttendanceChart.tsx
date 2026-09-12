import { CountUp } from '@/components/ui/CountUp';

interface AttendanceChartProps {
  data: { label: string; value: number }[];
}

/** Plain divs, real numbers, readable by screen readers as a list. */
export function AttendanceChart({ data }: AttendanceChartProps) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <section aria-labelledby="attendance-title" className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="attendance-title" className="display text-2xl">
          Attendance
        </h2>
        <p className="text-xs text-ink-muted">RSVPs per session, oldest first</p>
      </div>

      {data.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-ink-muted">
          No past sessions yet. Publish a few and the chart fills in.
        </p>
      ) : (
        <ul className="mt-6 flex h-56 items-end gap-2 sm:gap-4">
          {data.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex h-full flex-1 flex-col justify-end gap-2">
              <p className="text-center text-sm font-semibold tabular-nums">
                <CountUp value={item.value} />
              </p>
              <div
                className="w-full rounded-t-lg bg-accent transition-[height] duration-700 ease-turtle"
                style={{ height: `${Math.max(6, (item.value / max) * 100)}%` }}
              >
                <span className="sr-only">
                  {item.label}: {item.value} RSVPs
                </span>
              </div>
              <p className="line-clamp-2 h-8 text-center text-[10px] font-medium leading-tight text-ink-muted">
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
