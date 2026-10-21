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
      { value: 6, suffix: '', label: 'certifications and job simulations completed' },
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
  photo: '/me2.png',
  aboutPhoto: '/me.png', // used in the About section
  email: 'guriqbal.singh.1108@gmail.com',
  socials: [
    { label: 'LinkedIn', href: 'https://linkedin.com/in/guriqbal-singh-48057739a' },
    { label: 'GitHub', href: 'https://github.com/' },
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
      title: 'CS50 AI with Python',
      year: '2024',
      role: 'Harvard Online Course',
      description: 'Explored core concepts and algorithms at the foundation of modern artificial intelligence: graph search, knowledge representation, probabilistic inference, machine learning, and neural networks.',
      highlights: [
        'Built graph search agents implementing A* and Minimax with Alpha-Beta pruning for games',
        'Modelled knowledge representation, propositional logic, and inference algorithms',
        'Implemented probabilistic models, Markov decision processes, and Bayesian networks in Python',
        'Trained machine learning models and convolutional neural network image classifiers with TensorFlow',
      ],
      stack: ['Python', 'AI & ML', 'Search Algorithms', 'TensorFlow', 'Neural Networks'],
      image: '/projects/CS50AI_LOW.png',
      imageFull: '/projects/CS50AI.png',
      from: '#3d8bff',
      to: '#1d2f9a',
    },
    {
      title: 'Software Engineering Simulation',
      year: '2024',
      role: 'Virtual Job Simulation',
      description: 'Completed practical engineering simulation tasks involving system design, interface enhancements, and data feed processing for financial applications.',
      highlights: [
        'Configured local development environments and integrated real-time data feeds',
        'Implemented data streaming visualization tools for monitoring market metrics',
        'Applied test-driven development methodologies to resolve edge-case anomalies',
      ],
      stack: ['Python', 'TypeScript', 'Git', 'Data Feeds'],
      image: '/projects/SEJS_LOW.png',
      imageFull: '/projects/SEJS.png',
      from: '#2fd3ff',
      to: '#0b328a',
    },
    {
      title: 'Data Analytics & Visualization',
      year: '2023',
      role: 'Virtual Job Simulation',
      description: 'Analyzed complex datasets to discover operational patterns, creating clear visual dashboards to communicate key business insights to leadership.',
      highlights: [
        'Cleaned, structured, and validated multidimensional transaction datasets',
        'Built insightful visual charts and executive dashboards',
        'Formulated data-driven recommendations tailored for non-technical stakeholders',
      ],
      stack: ['Python', 'Data Analytics', 'Visualization', 'Statistics'],
      image: '/projects/DAJS_LOW.png',
      imageFull: '/projects/DAJS.png',
      from: '#0284c7',
      to: '#1e40af',
    },
    {
      title: 'Computer Science Diploma Curriculum',
      year: '2021 – Present',
      role: 'Academic Programme at SLIET',
      description: 'Comprehensive technical coursework covering computer architecture, procedural programming, data structures, database management, and operating systems.',
      highlights: [
        'Deep dive into procedural programming and memory management in C and Python',
        'Database normalization and relational schema design',
        'Active contributor to departmental technology collaborative labs and problem-solving sessions',
      ],
      stack: ['C', 'Python', 'Data Structures', 'DBMS', 'Linux'],
      from: '#12c2e9',
      to: '#1b3cff',
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
      summary: 'Completed intensive coursework on foundational AI and machine learning in Python, covering heuristic search, Bayesian probability, optimization, and deep learning architectures.',
    },
  ] satisfies Job[],
}
