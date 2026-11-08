// Search index for the on-site assistant. Built at build time from the site's own content,
// so the demo assistant can point visitors to the right page before a real AI API is connected.
import { getCollection } from 'astro:content';
import { site, faculties } from '../lib/site';
import { url, formatDate } from '../lib/url';

export async function GET() {
  const [notices, news, departments] = await Promise.all([
    getCollection('notices'),
    getCollection('news'),
    getCollection('departments'),
  ]);
  const clean = (s = '') => s.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);

  const pages = [
    { title: 'Admission 2026-27', url: url('/admission'), kind: 'Page', text: 'How to apply, important dates, units and eligibility, fees, frequently asked questions, admission test, online application, seats, GPA requirement.' },
    { title: 'About LSTU', url: url('/about'), kind: 'Page', text: `History, vision and mission, administration, campus and facilities: library, laboratories, halls of residence, medical centre, transport.` },
    { title: "Vice-Chancellor's Message", url: url('/about#vc'), kind: 'Page', text: `${site.vc.name}, ${site.vc.title} of ${site.name}. Message from the VC.` },
    { title: 'Academics and Departments', url: url('/academics'), kind: 'Page', text: `Faculties and departments. ${faculties.map((f) => f.name).join(', ')}.` },
    { title: 'Academic Calendar', url: url('/academics#calendar'), kind: 'Page', text: 'Semester dates, classes start, mid-term, final examination, holidays, results.' },
    { title: 'Notice Board', url: url('/notices'), kind: 'Page', text: 'All notices: exams, admission, recruitment, tenders, holidays.' },
    { title: 'News and Events', url: url('/news'), kind: 'Page', text: 'Campus news, research, events, programmes.' },
    { title: 'Contact Us', url: url('/contact'), kind: 'Page', text: `Address ${site.address}. Phone ${site.phone}. Email ${site.email}. Registrar ${site.registrarEmail}. Map, location, how to reach campus.` },
    { title: 'Library and Facilities', url: url('/about#facilities'), kind: 'Page', text: 'Central library, books, journals, digital resources, labs, hostel, halls, medical centre, cafeteria, mosque, transport bus.' },
  ];

  const items = [
    ...pages,
    ...departments.map((d) => ({
      title: `Department of ${d.data.name} (${d.data.short})`,
      url: url(`/academics/${d.id}`),
      kind: 'Department',
      text: clean(`${d.data.faculty}. Programs: ${d.data.programs.join(', ')}. Seats: ${d.data.seats}. ${d.body}`),
    })),
    ...notices.map((n) => ({
      title: n.data.title,
      url: url(`/notices/${n.id}`),
      kind: `Notice · ${n.data.category} · ${formatDate(n.data.date)}`,
      text: clean(`${n.data.category} notice. ${n.body}`),
    })),
    ...news.map((n) => ({
      title: n.data.title,
      url: url(`/news/${n.id}`),
      kind: `${n.data.type} · ${formatDate(n.data.date)}`,
      text: clean(`${n.data.summary} ${n.body}`),
    })),
  ];

  return new Response(JSON.stringify({ site: { name: site.name, email: site.email, phone: site.phone }, items }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
