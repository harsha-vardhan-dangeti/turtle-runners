'use client';

import { useState } from 'react';

interface AccordionItem {
  q: string;
  a: string;
}

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-hairline border-y border-hairline">
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-green-deep"
              >
                <span className="text-base font-semibold sm:text-lg">{item.q}</span>
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-hairline text-lg leading-none transition-transform duration-500 ease-turtle ${
                    isOpen ? 'rotate-45 border-green-primary/40 bg-green-tint text-green-deep' : ''
                  }`}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-500 ease-turtle ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-6 text-sm leading-relaxed text-ink-muted sm:text-base">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
