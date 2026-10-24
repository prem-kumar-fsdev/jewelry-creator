export default function StoreAccordion({ id, title, open, onToggle, children }) {
  return <section className={`sj-accordion ${open ? 'is-open' : ''}`}>
    <button className="sj-accordion-trigger" id={`${id}-trigger`} aria-expanded={open} aria-controls={id} onClick={onToggle}><span>{title}</span><span aria-hidden="true">{open ? '−' : '+'}</span></button>
    <div id={id} className="sj-accordion-body" role="region" aria-labelledby={`${id}-trigger`} hidden={!open}>{children}</div>
  </section>;
}
