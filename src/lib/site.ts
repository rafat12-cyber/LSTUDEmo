export const site = {
  name: 'Lakshmipur Science and Technology University',
  nameBn: 'লক্ষ্মীপুর বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়',
  short: 'LSTU',
  motto: 'Knowledge · Science · Progress',
  address: 'Lakshmipur Sadar, Lakshmipur-3700, Bangladesh',
  phone: '+880 0000-000000',
  email: 'info@lstu.edu.bd',
  registrarEmail: 'registrar@lstu.edu.bd',
  vc: {
    name: 'Professor Dr. Muhammad Hanif (Murad)',
    title: 'Vice-Chancellor',
    photo: '/images/vc.jpg',
  },
};

export const faculties = [
  { name: 'Faculty of Engineering and Technology', icon: '⚙', blurb: 'Computing, electrical and information engineering for a digital Bangladesh.' },
  { name: 'Faculty of Science', icon: '⚛', blurb: 'Foundations in mathematics, physics, chemistry and statistics.' },
  { name: 'Faculty of Agriculture and Marine Science', icon: '🌱', blurb: 'Farming, fisheries and coastal resources of the Meghna region.' },
  { name: 'Faculty of Business Studies', icon: '📘', blurb: 'Management, accounting and entrepreneurship for a growing economy.' },
];

export type NavItem = { label: string; href: string; children?: NavItem[] };

export const nav: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'About', href: '/about',
    children: [
      { label: 'History', href: '/about#history' },
      { label: 'Vision and Mission', href: '/about#mission' },
      { label: "Vice-Chancellor's Message", href: '/about#vc' },
      { label: 'Administration', href: '/about#administration' },
    ],
  },
  { label: 'Academics', href: '/academics' },
  { label: 'Admission', href: '/admission' },
  { label: 'Notices', href: '/notices' },
  { label: 'News and Events', href: '/news' },
  { label: 'Contact', href: '/contact' },
];
