/**
 * ✏️  SINGLE SOURCE OF TRUTH — edit this file and the whole site updates.
 */
export interface Project {
  title: string
  year: string
  role: string
  description: string
  /** Optional bullet points shown on the item's detail page. */
  highlights?: string[]
  stack: string[]
  /** Link to verify the credential. When empty or omitted, the "Show credential" button is hidden for that project. */
  credentialUrl?: string
  /** Optional. When omitted, the "Visit project" button is not shown. */
  link?: string
  /** Optional screenshot (put it in /public). When omitted, generated artwork from `from`/`to` is shown. */
  image?: string
  /** High-quality version shown when the image is enlarged. */
  imageFull?: string
  from: string
  to: string
}

export interface Job {
  company: string
  role: string
  period: string
  summary: string
}

export const resume = {
  name: 'Guriqbal Singh',
  title: 'Aspiring AI-enabled Software Developer',
  headline: 'Blending creative vision with an obsession for minor details',
  intro: "Hi, I'm Guriqbal, a Computer Science student at SLIET. I focus on every small detail of UI, perfecting each interaction with Python and AI rather than rushing—building software that is thoughtful, precise, and genuinely human.",
  bio: [
    "I'm a Computer Science diploma student at SLIET with a strong foundation in Python, C, HTML and CSS, and I've completed Harvard's CS50 course on Artificial Intelligence with Python. I want to grow into an AI-enabled software developer who builds intelligent, impactful and user-friendly solutions.",
    "Since January 2022 I've worked at a CSC e-Governance centre in Sangrur, helping local citizens with government services. Four years of explaining complicated procedures in plain language is what taught me to put users first, keep layouts calm, and write code that solves real problems.",
  ],
  /** Everything the About section shows. Edit the text here. */
  about: {
    summary: "I'm a Computer Science diploma student at SLIET, growing into an AI-enabled software developer who builds intelligent, user-friendly solutions.",
    location: 'Sangrur, Punjab, India',
    stats: [
      { value: 4, suffix: '+', label: 'years serving the public at a CSC e-Governance centre' },
      { value: 7, suffix: '', label: 'certifications and job simulations completed' },
    ],
    education: {
      school: 'SLIET',
      course: 'Diploma in Computer Science',
      period: '2024 to 2027 (expected)',
      website: 'https://sliet.ac.in/',
    },
    languages: [
      { name: 'Hindi', level: 'Native' },
      { name: 'Punjabi', level: 'Native' },
      { name: 'English', level: 'Limited working' },
    ],
    focus: { title: "What I'm working on now.", line: 'Diploma in Computer Science at SLIET, 2024 to 2027', cta: 'See my learning' },
  },
  /** Path inside /public. Transparent PNG gives the cleanest portrait. */
  photo: '/me2.webp',
  aboutPhoto: '/me.webp', // used in the About section
  email: 'guriqbal.singh.1108@gmail.com',
  socials: [
    { label: 'LinkedIn', href: 'https://linkedin.com/in/guriqbal-singh-48057739a' },
    { label: 'GitHub', href: 'https://github.com/guripb13' },
  ],
  skills: [
    'Python',
    'C',
    'Artificial Intelligence',
    'Machine Learning',
    'HTML & CSS',
    'Data Structures',
    'Algorithms',
    'TensorFlow',
    'Problem Solving',
    'Git',
    'Linux',
    'e-Governance Services',
  ],
  projects: [
    {
      title: 'CS205: Building with Artificial Intelligence',
      year: 'Mar 2026',
      role: 'Saylor University',
      description: 'Covers foundational concepts and practical applications of building and working with artificial intelligence systems.',
      highlights: [
        'Studied the foundational concepts behind modern AI systems',
        'Applied those concepts to building and working with AI systems in practice',
      ],
      stack: ['Artificial Intelligence (AI)'],
      credentialUrl: 'https://learn.saylor.org/admin/tool/certificate/index.php?code=3877746598GS',
      from: '#3d8bff',
      to: '#1d2f9a',
      image: '/projects/CS205_LOW.png',
    },
    {
      title: 'Mastercard - Cybersecurity Job Simulation',
      year: 'Mar 2026',
      role: 'Mastercard (via Forage)',
      description: "Served as an analyst on Mastercard's Security Awareness Team, helping protect the business through better security habits and training.",
      highlights: [
        'Identified and reported security threats such as phishing',
        'Analyzed business areas that required more robust security training',
        'Implemented security awareness courses and procedures',
      ],
      stack: ['Cybersecurity', 'Phishing Analysis', 'Security Awareness'],
      credentialUrl: 'https://www.theforage.com/completion-certificates/mfxGwGDp6WkQmtmTf/vcKAB5yYAgvemepGQ_mfxGwGDp6WkQmtmTf_695b2e3839ff7eaad974d7cd_1772974775071_completion_certificate.pdf',
      image: '/projects/MCJS_LOW.png',
      from: '#0284c7',
      to: '#1e40af',
    },
    {
      title: 'Electronic Arts (EA) - Software Engineering Job Simulation',
      year: 'Jan 2026',
      role: 'Electronic Arts (via Forage)',
      description: 'Proposed a new feature for EA Sports College Football, designed it in code, and optimized the codebase by fixing a bug with a better data structure.',
      highlights: [
        'Wrote a detailed feature proposal for stakeholders',
        'Built a class diagram and a C++ header file with class definitions',
        'Optimized the codebase by implementing an improved data structure to patch a bug',
      ],
      stack: ['C++', 'Code Quality', 'Code Review', 'Software Engineering'],
      credentialUrl: 'https://www.theforage.com/completion-certificates/j43dGscQHtJJ57N54/a77WE3de8qrxWferQ_j43dGscQHtJJ57N54_695b2e3839ff7eaad974d7cd_1768222679714_completion_certificate.pdf',
      image: '/projects/SEJS_LOW.png',
      from: '#2fd3ff',
      to: '#0b328a',
    },
    {
      title: 'Deloitte Australia - Data Analytics Job Simulation',
      year: 'Jan 2026',
      role: 'Deloitte (via Forage)',
      description: 'Completed a job simulation focused on data analysis and forensic technology.',
      highlights: [
        'Created data dashboards using Tableau',
        'Used Excel to classify data and draw business conclusions',
      ],
      stack: ['Tableau', 'Excel', 'Data Analytics'],
      credentialUrl: 'https://www.theforage.com/completion-certificates/9PBTqmSxAf6zZTseP/io9DzWKe3PTsiS6GG_9PBTqmSxAf6zZTseP_695b2e3839ff7eaad974d7cd_1768135596287_completion_certificate.pdf',
      image: '/projects/DAJS_LOW.png',
      from: '#0284c7',
      to: '#1e40af',
    },
    {
      title: 'Forage Australia - Data Labeling',
      year: 'Jan 2026',
      role: 'Forage',
      description: 'Worked as a Data Labeling Analyst for a hypothetical AI company, with a focus on ethical privacy practices and human-AI collaboration.',
      highlights: [
        'Reviewed real customer support messages',
        'Evaluated tricky edge cases and wrote rationales for final label decisions',
        'Supported AI operations, trust & safety, and machine learning with ethical privacy practices',
      ],
      stack: ['Data Labeling', 'AI Operations', 'Trust & Safety'],
      credentialUrl: 'https://www.theforage.com/completion-certificates/HgpPSsyQpzob6HEh9/Fnbjyox4Y4SciuEGF_HgpPSsyQpzob6HEh9_695b2e3839ff7eaad974d7cd_1767614201018_completion_certificate.pdf',
      image: '/projects/FADL_LOW.png',
      from: '#12c2e9',
      to: '#1b3cff',
    },
    {
      title: 'Deloitte Australia - Cyber Job Simulation',
      year: 'Jan 2026',
      role: 'Deloitte (via Forage)',
      description: 'Completed a simulation involving web activity log analysis and supporting clients through a simulated cybersecurity breach.',
      highlights: [
        'Analyzed web activity logs',
        'Supported clients through a simulated cybersecurity breach',
        'Answered analytical questions to identify suspicious user activity',
      ],
      stack: ['Cybersecurity', 'Computer Networking'],
      credentialUrl: 'https://www.theforage.com/completion-certificates/9PBTqmSxAf6zZTseP/E9pA6qsdbeyEkp3ti_9PBTqmSxAf6zZTseP_695b2e3839ff7eaad974d7cd_1767584717392_completion_certificate.pdf',
      image: '/projects/DCJS_LOW.png',
      from: '#3d8bff',
      to: '#0b328a',
    },
    {
      title: "CS50's Introduction to Artificial Intelligence with Python",
      year: 'Dec 2025',
      role: 'Harvard University',
      description: 'Explored how AI works and gained core knowledge essential for AI engineering.',
      highlights: [
        'Built 12 hands-on projects using Python, GitHub, and GitHub Codespaces',
        'Covered the core ideas behind how AI works, from search to learning',
      ],
      stack: ['Artificial Intelligence (AI)', 'Python'],
      credentialUrl: 'https://certificates.cs50.io/e695a292-9cbc-4887-9bda-3c77262c8f8f.pdf?size=letter',
      image: '/projects/CS50AI_LOW.png',
      from: '#2fd3ff',
      to: '#1d2f9a',
    },
  ] as Project[],
  experience: [
    {
      company: 'CSC e-Governance Centre',
      role: 'Citizen Services & Technical Operations',
      period: 'Jan 2022 to Present',
      summary: 'Four years helping local citizens with digital government schemes, identity documentation, and official portal submissions in Sangrur. Translating complicated bureaucratic procedures into calm, step-by-step assistance.',
    },
    {
      company: 'SLIET (Sant Longowal Institute of Engineering & Technology)',
      role: 'Diploma Student — Computer Science & Engineering',
      period: '2021 to Present',
      summary: 'Pursuing a structured diploma curriculum in Computer Science, mastering foundational programming in C and Python, operating systems, data structures, and applied AI.',
    },
    {
      company: 'Harvard Online / edX',
      role: 'CS50 AI Student',
      period: '2023 to 2024',
      summary: 'Completed intensive coursework on foundational AI and machine learning in Python, covering heavy search, Bayesian probability, optimization, and deep learning architectures.',
    },
  ] satisfies Job[],
}