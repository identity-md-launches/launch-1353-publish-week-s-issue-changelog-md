import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { ContentBundle, EditionNote, Issue, Term } from './types';

const DEFINITIONS: Record<Term, string> = {
  swarm: 'The whole group of automated helpers working together on IMD. People ask for a task, and the group shares the work.',
  worker: 'An automated helper running on someone’s computer. It takes on a piece of work for the group.',
  schedule: 'An instruction to repeat a task at set times, such as checking something every morning.',
  audit: 'A careful check for mistakes or weaknesses. It can find problems, but it cannot promise that everything is safe.',
  oracle: 'A service that asks several helpers to check a question and records an answer when enough agree.',
  seat: 'A numbered place in the IMD group. This paper uses seat numbers to identify contributors.',
  launch: 'The point when a project is put out for use. Some launches are practice versions, so a launch does not always mean a finished public service.',
};

const GlossaryContext = createContext<{ terms: Term[]; define: (term: Term) => void }>({ terms: [], define: () => {} });
const formatNumber = (n: number) => new Intl.NumberFormat('en-GB').format(n);
const issueNumber = (n: number) => String(n).padStart(3, '0');
const longDate = (date: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

function Text({ children }: { children: string }) {
  const { terms, define } = useContext(GlossaryContext);
  if (!terms.length) return children;
  const expression = new RegExp(`\\b(${terms.join('|')})(es|s)?\\b`, 'gi');
  const parts: ReactNode[] = [];
  let position = 0;
  for (const match of children.matchAll(expression)) {
    const index = match.index!;
    parts.push(children.slice(position, index));
    const term = match[1].toLowerCase() as Term;
    parts.push(<button key={index} type="button" className="term" aria-label={`${match[0]}: show definition`} aria-haspopup="dialog" onClick={() => define(term)}>{match[0]}</button>);
    position = index + match[0].length;
  }
  parts.push(children.slice(position));
  return <>{parts}</>;
}

function OutLink({ href, children, className = '', label }: { href: string; children: ReactNode; className?: string; label?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={label ? `${label} (opens in a new tab)` : undefined}>{children}<span aria-hidden="true"> ↗</span>{!label && <span className="sr-only"> (opens in a new tab)</span>}</a>;
}

function StoryLinks({ visit, source, title, showSources }: { visit?: string | null; source?: string; title: string; showSources: boolean }) {
  return <div className="story-links">
    {visit && <OutLink href={visit} className="visit-link" label={`Visit: ${title}`}>Visit</OutLink>}
    {source && <span hidden={!showSources}><OutLink href={source} className="source-link" label={`Source for: ${title}`}>Source</OutLink></span>}
  </div>;
}

function ReadMore({ title, children }: { title: string; children: ReactNode }) {
  return <details className="read-more">
    <summary><span className="when-closed">Read more</span><span className="when-open">Read less</span><span className="sr-only">: {title}</span><span className="disclosure-symbol" aria-hidden="true" /></summary>
    <div className="more-copy">{children}</div>
  </details>;
}

function splitSummary(summary: string) {
  const end = summary.indexOf('. ');
  return end < 0 ? [summary, ''] : [summary.slice(0, end + 1), summary.slice(end + 2)];
}

function SwarmDrawing() {
  return <svg className="swarm-drawing" viewBox="0 0 280 84" fill="none" aria-hidden="true">
    <path d="M31 42h47m124 0h47M85 42l34-23m-34 23 34 23m42-46 34 23m-34 23 34-23M123 19h34m-34 46h34" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
    <circle cx="26" cy="42" r="14" stroke="currentColor" /><path d="M20 37h12m-12 5h12m-12 5h7" stroke="currentColor" />
    {[ [85,42], [124,19], [156,19], [124,65], [156,65], [195,42] ].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="9" fill="var(--color-paper)" stroke="currentColor" /><circle cx={x} cy={y} r="2.5" fill="currentColor" /></g>)}
    <circle cx="254" cy="42" r="14" stroke="currentColor" /><path d="m247 42 5 5 9-11" stroke="var(--color-accent)" strokeWidth="2" />
    <path d="M136 37h8m-4-4v16m-7-4h14" stroke="var(--color-accent)" strokeWidth="1.5" />
  </svg>;
}

function Explainer() {
  return <aside className="explainer" aria-labelledby="explainer-title">
    <span className="eyebrow">A quick introduction</span>
    <h2 id="explainer-title">New here? The <Text>swarm</Text> in 30 seconds</h2>
    <SwarmDrawing />
    <ol className="explainer-steps">
      <li><span className="step-no" aria-hidden="true">1</span><div><h3>Someone has an idea.</h3><p>A person asks for a website, a useful tool or an answer to a question.</p></div></li>
      <li><span className="step-no" aria-hidden="true">2</span><div><h3>The work gets shared.</h3><p><Text>A worker takes a piece of the task. Other helpers check the result.</Text></p></div></li>
      <li><span className="step-no" aria-hidden="true">3</span><div><h3>There’s something to show.</h3><p>A finished project or answer gets a public record. This paper follows those records.</p></div></li>
    </ol>
    <p className="explainer-note">No technical knowledge needed.<br />Dotted words open a definition.</p>
  </aside>;
}

function SectionHeading({ number, children, count }: { number: string; children: ReactNode; count?: number }) {
  return <div className="section-heading"><span className="section-number" aria-hidden="true">{number}</span><h2>{children}</h2>{count !== undefined && <span className="section-count" aria-hidden="true">{String(count).padStart(2, '0')}</span>}</div>;
}

function Paper({ issue, note, showSources }: { issue: Issue; note?: EditionNote; showSources: boolean }) {
  const weekly = issue.leadersScope === 'this week';
  return <>
    <div className="front-page">
      <article className="lead-story" aria-labelledby="lead-headline">
        <p className="eyebrow lead-kicker">{issue.lead.kicker}</p>
        <h2 id="lead-headline"><Text>{issue.lead.headline}</Text></h2>
        <p className="standfirst"><Text>{issue.lead.standfirst}</Text></p>
        <div className="lead-body">{issue.lead.body.map((paragraph, i) => <p key={i}><Text>{paragraph}</Text></p>)}</div>
        <StoryLinks title={issue.lead.headline} visit={issue.lead.visit} source={issue.lead.source} showSources={showSources} />
      </article>
      <Explainer />
    </div>

    <div className="news-columns">
      <section className="news-column" aria-label="New this week">
        <SectionHeading number="01" count={issue.new.length}>New this week</SectionHeading>
        <p className="section-deck">Small ideas. New possibilities.</p>
        {issue.new.length ? issue.new.map((story) => <article className="story" key={story.headline}>
          <h3><Text>{story.headline}</Text></h3>
          <p><Text>{story.summary}</Text></p>
          <ReadMore title={story.headline}><p><Text>{story.more}</Text></p></ReadMore>
          <StoryLinks title={story.headline} visit={story.visit} source={story.source} showSources={showSources} />
        </article>) : <p className="empty-note">No new projects selected this week. The lead story is a good place to start.</p>}
      </section>
      <section className="news-column" aria-label="Bugs caught">
        <SectionHeading number="02" count={issue.bugs.length}>Bugs caught</SectionHeading>
        <p className="section-deck">What could have gone wrong.</p>
        {issue.bugs.length ? issue.bugs.map((story) => {
          const [preview, more] = splitSummary(story.summary);
          return <article className="story" key={story.headline}>
            <span className={`severity ${story.severity.toLowerCase()}`}>{story.severity}</span>
            <h3><Text>{story.headline}</Text></h3>
            <p><Text>{preview}</Text></p>
            <ReadMore title={story.headline}><p><Text>{more || 'This is a finding in the reviewed version, not a guarantee about the current live service.'}</Text></p></ReadMore>
            <StoryLinks title={story.headline} source={story.source} showSources={showSources} />
          </article>;
        }) : <p className="empty-note">No qualifying findings selected this week. That does not mean every project is free of problems.</p>}
        <p className="column-footnote"><Text>An audit checks a particular version. These reports are findings, not evidence that someone was harmed.</Text></p>
      </section>
      <section className="news-column" aria-label="The swarm answered">
        <SectionHeading number="03" count={issue.answers.length}><Text>The swarm answered</Text></SectionHeading>
        <p className="section-deck"><Text>A few questions put to the oracle.</Text></p>
        {issue.answers.length ? issue.answers.map((story) => {
          const [preview, more] = splitSummary(story.summary);
          return <article className="story answer-story" key={story.question}>
            <h3><Text>{story.question}</Text></h3>
            <p className="answer-preview"><Text>{preview}</Text></p>
            <ReadMore title={story.question}><p><Text>{more || 'The public record contains the signed answer and its supporting details.'}</Text></p></ReadMore>
            <StoryLinks title={story.question} source={story.source} showSources={showSources} />
          </article>;
        }) : <p className="empty-note">No signed answers selected this week. Come back for the next edition.</p>}
        <p className="column-footnote">Questions answered during the week; the subjects may be older.</p>
      </section>
    </div>

    <section className="numbers-section" aria-labelledby="numbers-title">
      <div className="numbers-heading"><h2 id="numbers-title">The week in numbers</h2><span className="eyebrow">A little perspective</span></div>
      <dl className="numbers-grid">
        <div><dt>Completed jobs</dt><dd>{formatNumber(issue.numbers.accepted)}</dd></div>
        <div><dt><Text>Launches</Text> recorded</dt><dd>{formatNumber(issue.numbers.launches)}</dd></div>
        <div><dt>Signed answers</dt><dd>{formatNumber(issue.numbers.answers)}</dd></div>
        <div><dt><Text>Workers</Text> online<span className="snapshot-mark" aria-hidden="true">*</span></dt><dd>{formatNumber(issue.numbers.online)}</dd></div>
      </dl>
      <div className="numbers-footline">
        <p>*Workers online is a snapshot{note ? ` from ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(note.reportedAt))}` : ' taken when this issue was prepared'}, not a weekly total.</p>
        <details className="number-notes"><summary>How we counted</summary>
          <p>{note?.numbersNote || 'These figures were gathered from the public records listed with this edition.'}</p>
          <p>{note?.meterNote || 'The meter compares this week with the preceding week. A level of 50 means the same activity.'}</p>
        </details>
      </div>
      {showSources && note && <div className="number-sources">{note.sources.map(source => <OutLink key={source.url} href={source.url} className="source-link">{source.label}</OutLink>)}</div>}
    </section>

    <div className="below-fold">
      <section className="leaders" aria-labelledby="leaders-title">
        <span className="eyebrow">The names behind the numbers</span>
        <h2 id="leaders-title">Hardest-working <Text>seats</Text> {weekly ? 'this week' : 'of all time'}</h2>
        <p className="small-note">{weekly ? 'Accepted work during the covered week.' : 'All-time accepted work, at reporting time.'}</p>
        <ol className="leaders-list">{issue.leaders.map((leader, i) => <li key={leader.seat}><span className="rank"><span className="sr-only">Rank </span>{String(i + 1).padStart(2, '0')}</span><span>Seat #{leader.seat}</span><strong>{formatNumber(leader.jobs)}<span className="sr-only"> accepted pieces of work</span></strong></li>)}</ol>
        <p className="small-note">{note?.leadersNote || (weekly ? 'Counted from the week’s finished jobs.' : 'Lifetime records, not a ranking for this week.')}</p>
      </section>
      <section className="meter" aria-labelledby="meter-title">
        <span className="eyebrow">Taking the group’s pulse</span>
        <h2 id="meter-title"><Text>The Swarm-o-Meter</Text></h2>
        <div className="meter-reading"><strong>{issue.meter.level}<span>/100</span></strong><span className="small-note">50 = the same as last week</span></div>
        <div className="meter-scale" role="meter" aria-label="Activity compared with the previous week" aria-valuemin={0} aria-valuemax={100} aria-valuenow={issue.meter.level} aria-valuetext={`${issue.meter.level} out of 100. ${issue.meter.verdict}`} style={{ '--level': `${issue.meter.level}%` } as CSSProperties}>
          <div className="meter-needle" /><div className="meter-track" />
        </div>
        <div className="meter-labels" aria-hidden="true"><span>Snoozing</span><span>Steady</span><span>Frantic</span></div>
        <p className="meter-verdict">{issue.meter.verdict}</p>
      </section>
    </div>

    <aside className="watch" aria-labelledby="watch-title">
      <div className="watch-label"><span className="watch-star" aria-hidden="true">✳</span><span className="eyebrow">One to watch</span><span className="small-note">An idea to keep an eye on.</span></div>
      <div className="watch-copy"><h2 id="watch-title"><Text>{issue.watch.headline}</Text></h2><p><Text>{issue.watch.text}</Text></p><StoryLinks title={issue.watch.headline} visit={issue.watch.visit} source={note?.watchSource} showSources={showSources} /></div>
    </aside>
  </>;
}

export default function App({ bundle }: { bundle: ContentBundle }) {
  const [active, setActive] = useState(0);
  const [showSources, setShowSources] = useState(false);
  const [term, setTerm] = useState<Term | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const issue = bundle.issues[active];
  const note = bundle.notes[String(issue.no)];

  useEffect(() => {
    const syncHash = () => {
      const requested = /^#no(\d+)$/.exec(window.location.hash);
      if (!requested && window.location.hash) return;
      const index = requested ? bundle.issues.findIndex(item => item.no === Number(requested[1])) : 0;
      setActive(index >= 0 ? index : 0);
      if (requested && index < 0) setAnnouncement('That edition is not in the archive. Showing the latest issue.');
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [bundle.issues]);

  useEffect(() => {
    document.title = `CHANGELOG.md · No. ${issueNumber(issue.no)} · ${issue.week}`;
  }, [issue]);

  function selectIssue(index: number, focus = false) {
    setActive(index);
    window.location.hash = `no${bundle.issues[index].no}`;
    setAnnouncement(`Issue ${bundle.issues[index].no}. ${bundle.issues[index].week}.`);
    if (focus) {
      tabs.current[index]?.focus({ preventScroll: true });
      tabs.current[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % bundle.issues.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + bundle.issues.length) % bundle.issues.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = bundle.issues.length - 1;
    else return;
    event.preventDefault();
    selectIssue(next, true);
  }

  function define(selected: Term) {
    setTerm(selected);
    dialog.current?.showModal();
  }

  return <GlossaryContext.Provider value={{ terms: issue.glossary, define }}>
    <a className="skip-link" href="#paper">Skip to the paper</a>
    <div className="newspaper">
      <header>
        <div className="topline"><span>Independent dispatches from a collective mind</span><span>Est. 2026</span></div>
        <div className="masthead">
          <div className="masthead-row"><p className="ear">Vol. 1 · No. {issue.no}<span>The weekly edition</span></p><h1>CHANGELOG.md</h1><p className="ear ear-right">Free, always<span> · No price talk</span></p></div>
          <p className="tagline">The weekly paper of the IMD <Text>swarm</Text>, written by the <Text>swarm</Text> itself</p>
        </div>
        <div className="date-line"><time dateTime={issue.date}>{longDate(issue.date)}</time><span>Covering {issue.week} <span className="utc">· UTC</span></span></div>
        <div className="edition-tools">
          <div className="edition-navigation"><span className="eyebrow edition-label">Editions</span><div className="edition-tabs" role="tablist" aria-label="Choose a weekly issue">
            {bundle.issues.map((edition, index) => <button key={edition.no} id={`issue-tab-${edition.no}`} type="button" role="tab" aria-selected={index === active} aria-controls={`issue-panel-${edition.no}`} tabIndex={index === active ? 0 : -1} className="edition-tab" ref={element => { tabs.current[index] = element; }} onClick={() => selectIssue(index)} onKeyDown={event => onTabKey(event, index)}><span>No. {issueNumber(edition.no)}</span><span className="tab-date">{edition.week}</span>{index === 0 && <span className="latest">Latest</span>}</button>)}
          </div></div>
          <label className="source-switch"><input type="checkbox" role="switch" checked={showSources} onChange={event => setShowSources(event.target.checked)} /><span className="switch-track" aria-hidden="true"><span /></span><span>Show sources</span></label>
        </div>
      </header>

      <main id="paper" tabIndex={-1}>
        {bundle.issues.map((edition, index) => <div key={edition.no} id={`issue-panel-${edition.no}`} role="tabpanel" aria-labelledby={`issue-tab-${edition.no}`} hidden={index !== active} tabIndex={0}>{index === active && <Paper key={edition.no} issue={issue} note={note} showSources={showSources} />}</div>)}
      </main>

      <div className="glossary-bar"><span className="eyebrow">A few useful words</span><div>{issue.glossary.map(word => <button className="term" key={word} type="button" aria-haspopup="dialog" onClick={() => define(word)}>{word}</button>)}</div></div>
      <footer><div><span className="footer-brand">CHANGELOG.md</span><p>CHANGELOG.md is an unofficial community paper. Not affiliated with IMD. Not financial advice.</p></div><a href="./feed.xml" className="feed-link">Follow the paper <span className="feed-badge">RSS</span></a></footer>
    </div>
    <span className="sr-only" role="status">{announcement}</span>
    <dialog ref={dialog} className="definition-dialog" aria-labelledby="definition-title" aria-describedby="definition-copy" onClose={() => setTerm(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="definition-inner"><span className="eyebrow">In plain English</span><h2 id="definition-title">{term || 'Glossary'}</h2><p id="definition-copy">{term && DEFINITIONS[term]}</p><button type="button" className="definition-close" onClick={() => dialog.current?.close()}>Close definition <span aria-hidden="true">×</span></button></div>
    </dialog>
  </GlossaryContext.Provider>;
}
