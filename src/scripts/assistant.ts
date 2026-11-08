// LSTU assistant chat widget.
//
// Two modes:
// 1. API mode: when the site is built with PUBLIC_ASSISTANT_API set, each question is POSTed to that URL as
//    { message, history: [{ role: 'user' | 'assistant', content }], page }
//    and the endpoint should answer { reply: string, links?: [{ title, url }] }.
// 2. Demo mode (default): answers come from this website itself, using /assistant-index.json
//    and a few built-in answers for the most common questions.

type Link = { title: string; url: string; kind?: string };
type Item = Link & { text: string };
type Turn = { role: 'user' | 'assistant'; content: string };

const root = document.querySelector<HTMLElement>('.assistant');

if (root) {
  const fab = root.querySelector<HTMLButtonElement>('.assistant-fab')!;
  const panel = root.querySelector<HTMLElement>('.assistant-panel')!;
  const close = root.querySelector<HTMLButtonElement>('.assistant-close')!;
  const log = root.querySelector<HTMLElement>('.assistant-log')!;
  const form = root.querySelector<HTMLFormElement>('.assistant-form')!;
  const input = root.querySelector<HTMLInputElement>('#assistant-input')!;
  const chips = root.querySelector<HTMLElement>('.assistant-chips')!;
  const api = root.dataset.api || '';
  const indexUrl = root.dataset.index || '';
  const history: Turn[] = [];
  let index: Item[] | null = null;
  let site = { name: 'LSTU', email: '', phone: '' };

  const open = (state: boolean) => {
    panel.hidden = !state;
    root.classList.toggle('open', state);
    fab.setAttribute('aria-expanded', String(state));
    if (state) { input.focus(); loadIndex(); } else fab.focus();
  };
  fab.addEventListener('click', () => open(panel.hidden));
  close.addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) open(false); });

  async function loadIndex() {
    if (index || !indexUrl) return;
    try {
      const res = await fetch(indexUrl);
      const data = await res.json();
      index = data.items; site = data.site;
    } catch { index = []; }
  }

  function add(role: 'user' | 'bot', text: string, links: Link[] = []) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    text.split('\n').filter(Boolean).forEach((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      div.appendChild(p);
    });
    if (links.length) {
      const ul = document.createElement('ul');
      ul.className = 'msg-links';
      links.slice(0, 4).forEach((l) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = l.url; a.textContent = l.title;
        li.appendChild(a);
        if (l.kind) { const s = document.createElement('small'); s.textContent = l.kind; li.appendChild(s); }
        ul.appendChild(li);
      });
      div.appendChild(ul);
    }
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function typing() {
    const div = document.createElement('div');
    div.className = 'msg bot typing';
    div.setAttribute('aria-label', 'Assistant is typing');
    div.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  // ---- Demo mode: built-in answers + site search ----
  const STOP = new Set('a an the is are was of to in on for and or how what when where who which do does can i my me you your we our about with at by be from find get please tell show'.split(' '));
  const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9ঀ-৿\s-]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));

  function search(q: string): Item[] {
    if (!index) return [];
    const qt = tokens(q);
    if (!qt.length) return [];
    return index
      .map((it) => {
        const title = it.title.toLowerCase();
        const body = `${it.text} ${it.kind ?? ''}`.toLowerCase();
        let score = 0;
        qt.forEach((t) => {
          const stem = t.length > 4 ? t.slice(0, -1) : t;
          if (title.includes(stem)) score += 3;
          if (body.includes(stem)) score += 1;
        });
        return { it, score };
      })
      .filter((r) => r.score > 1)
      .sort((a, b) => b.score - a.score)
      .filter((r, _, all) => r.score >= all[0].score * 0.6) // keep only the strongest matches
      .map((r) => r.it);
  }

  const find = (pred: (i: Item) => boolean) => (index ?? []).filter(pred);

  function localAnswer(q: string): { reply: string; links: Link[] } {
    const s = q.toLowerCase();
    const has = (...w: string[]) => w.some((x) => s.includes(x));

    if (/^(hi|hello|hey|salam|assalam|good (morning|evening|afternoon))\b/.test(s.trim())) {
      return { reply: 'Hello! How can I help you today? You can ask me about admission, exams, departments, notices or how to reach us.', links: [] };
    }
    if (has('thank')) return { reply: "You're welcome! Is there anything else I can help you find?", links: [] };
    if (has('admission', 'apply', 'application', 'admit', 'enrol', 'enroll')) {
      return {
        reply: 'Admission for the 2026-27 undergraduate session: online applications open on 10 November 2026 and close on 30 November 2026. The Admission page has eligibility, the step-by-step guide and fees.',
        links: [{ title: 'Admission 2026-27', url: find((i) => i.title.startsWith('Admission'))[0]?.url ?? '#' }, ...search('admission notice circular admit card').slice(0, 2)],
      };
    }
    if (has('exam', 'schedule', 'routine', 'result')) {
      return { reply: 'Here are the latest exam notices and the academic calendar.', links: [...find((i) => (i.kind ?? '').includes('Exam')), ...find((i) => i.title === 'Academic Calendar')] };
    }
    if (has('fee', 'cost', 'tuition', 'payment')) {
      return { reply: 'Approximate first-year fees are listed on the Admission page. Fee deadlines are posted as notices.', links: [...find((i) => i.title.startsWith('Admission')), ...search('fee payment deadline')] };
    }
    if (has('contact', 'phone', 'email', 'registrar', 'address', 'location', 'reach', 'map')) {
      return { reply: `You can reach the university at ${site.phone} or ${site.email}. The Contact page has the address, a map and a message form.`, links: find((i) => i.title === 'Contact Us') };
    }
    if (has('vice', ' vc', 'vc ', 'chancellor')) {
      const vc = find((i) => i.title.startsWith("Vice-Chancellor"))[0];
      return { reply: vc ? vc.text.split('.')[0] + '.' : 'Please see the About page.', links: vc ? [vc] : [] };
    }
    if (has('department', 'subject', 'faculty', 'program', 'course')) {
      const depts = find((i) => i.kind === 'Department');
      const hit = search(q).filter((i) => i.kind === 'Department');
      return hit.length
        ? { reply: 'This department looks like what you need:', links: hit }
        : { reply: `LSTU has ${depts.length} departments in four faculties. Tell me a subject (for example CSE, Physics or Fisheries) and I'll take you there.`, links: find((i) => i.title === 'Academics and Departments') };
    }
    if (has('library', 'hostel', 'hall', 'transport', 'bus', 'medical', 'facility', 'facilities')) {
      return { reply: 'Campus facilities include the central library, laboratories, halls of residence, a medical centre and transport.', links: find((i) => i.title === 'Library and Facilities') };
    }
    if (has('job', 'recruit', 'vacancy', 'career')) {
      return { reply: 'Recruitment circulars are published on the notice board.', links: find((i) => (i.kind ?? '').includes('Recruitment')) };
    }

    const results = search(q);
    if (results.length) return { reply: 'Here is what I found on the website:', links: results };
    return {
      reply: `Sorry, I couldn't find that yet. Try different words, or contact the university office at ${site.email || 'the Contact page'}.`,
      links: find((i) => i.title === 'Contact Us'),
    };
  }

  async function ask(q: string): Promise<{ reply: string; links: Link[] }> {
    if (api) {
      try {
        const res = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: q, history, page: location.pathname }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        return { reply: String(data.reply ?? ''), links: Array.isArray(data.links) ? data.links : [] };
      } catch {
        await loadIndex();
        const fallback = localAnswer(q);
        return { reply: `I couldn't reach the assistant service just now, so here is what I found on the website. ${fallback.reply}`, links: fallback.links };
      }
    }
    await loadIndex();
    await new Promise((r) => setTimeout(r, 450)); // a short "thinking" pause feels more natural
    return localAnswer(q);
  }

  async function send(q: string) {
    q = q.trim();
    if (!q) return;
    add('user', q);
    history.push({ role: 'user', content: q });
    input.value = '';
    const t = typing();
    const { reply, links } = await ask(q);
    t.remove();
    add('bot', reply, links);
    history.push({ role: 'assistant', content: reply });
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  chips.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (b) send(b.textContent || '');
  });
}
