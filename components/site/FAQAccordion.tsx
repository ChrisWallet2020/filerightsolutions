"use client";

import { useState } from "react";

export type FAQ = { q: string; a: string };

export function FAQAccordion({ faqs }: { faqs: FAQ[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="faq">
      {faqs.map((f, i) => (
        <div key={i} className="faqItem">
          <button className="faqQ" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
            {f.q} <span className="muted">{openIdx === i ? "–" : "+"}</span>
          </button>
          {openIdx === i && <div className="faqA">{f.a}</div>}
        </div>
      ))}
    </div>
  );
}