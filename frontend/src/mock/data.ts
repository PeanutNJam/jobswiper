import { Job, Profile, Match } from '../types';

export interface MockJob extends Job {
  company: string;
  tags: string[];
  logoColor: string;
}

export interface MockMatch extends Match {
  jobTitle: string;
  company: string;
  matchedAt: string;
  logoColor: string;
}

export interface MockCandidate {
  id: string;
  name: string;
  title: string;
  description: string;
  location: string;
  skills: string[];
  avatarColor: string;
}

export const MOCK_JOBS: MockJob[] = [
  {
    id: '1',
    employerId: 'emp1',
    title: 'Senior Frontend Engineer',
    description:
      'Build beautiful, responsive interfaces using React Native and TypeScript. Own key product surfaces and collaborate with design, backend, and data teams to ship features used by millions.',
    salary: '$150k – $180k',
    location: 'San Francisco, CA',
    createdAt: '2024-01-15',
    company: 'TechCorp',
    tags: ['React', 'TypeScript', 'Node.js'],
    logoColor: '#0A66C2',
  },
  {
    id: '2',
    employerId: 'emp2',
    title: 'Product Manager',
    description:
      'Drive product strategy and roadmap for a fast-growing B2B SaaS platform. Work cross-functionally to define requirements and ship features that delight customers and move key metrics.',
    salary: '$130k – $160k',
    location: 'Remote',
    createdAt: '2024-01-14',
    company: 'StartupXYZ',
    tags: ['Strategy', 'Agile', 'Analytics'],
    logoColor: '#057642',
  },
  {
    id: '3',
    employerId: 'emp3',
    title: 'Backend Engineer (Go)',
    description:
      'Design and build high-throughput microservices in Go serving millions of requests per day. You will own critical infrastructure pieces and mentor junior engineers.',
    salary: '$160k – $200k',
    location: 'New York, NY',
    createdAt: '2024-01-13',
    company: 'FinTech Inc',
    tags: ['Go', 'PostgreSQL', 'Kubernetes'],
    logoColor: '#CC1016',
  },
  {
    id: '4',
    employerId: 'emp4',
    title: 'ML Engineer',
    description:
      'Train, deploy, and monitor production ML models at scale. Build the infrastructure that bridges research and production, and work closely with data scientists to ship impactful models.',
    salary: '$170k – $220k',
    location: 'Seattle, WA',
    createdAt: '2024-01-12',
    company: 'AI Labs',
    tags: ['Python', 'PyTorch', 'MLOps'],
    logoColor: '#7C3AED',
  },
  {
    id: '5',
    employerId: 'emp5',
    title: 'iOS Engineer',
    description:
      'Build native iOS experiences for 10M+ users. You will own onboarding, core product flows, and performance — and have a direct line to users through App Store reviews.',
    salary: '$140k – $170k',
    location: 'Austin, TX',
    createdAt: '2024-01-11',
    company: 'MobileFirst',
    tags: ['Swift', 'SwiftUI', 'CoreData'],
    logoColor: '#EA580C',
  },
  {
    id: '6',
    employerId: 'emp6',
    title: 'DevOps / Platform Engineer',
    description:
      'Own the developer experience: CI/CD pipelines, cloud infrastructure, observability, and on-call tooling. Help engineering teams ship faster and safer.',
    salary: '$145k – $175k',
    location: 'Chicago, IL',
    createdAt: '2024-01-10',
    company: 'CloudBase',
    tags: ['AWS', 'Terraform', 'Docker'],
    logoColor: '#0284C7',
  },
  {
    id: '7',
    employerId: 'emp7',
    title: 'Data Engineer',
    description:
      'Build reliable data pipelines powering analytics, recommendations, and product experimentation. Partner with ML and product teams to make trusted data available in real time.',
    salary: '$135k – $165k',
    location: 'Boston, MA',
    createdAt: '2024-01-09',
    company: 'DataHarbor',
    tags: ['Spark', 'Python', 'Airflow'],
    logoColor: '#2563EB',
  },
  {
    id: '8',
    employerId: 'emp8',
    title: 'UX Designer',
    description:
      'Design elegant mobile workflows for hiring teams and candidates. Lead research, prototype quickly, and partner closely with engineering to ship polished product experiences.',
    salary: '$120k – $150k',
    location: 'Los Angeles, CA',
    createdAt: '2024-01-08',
    company: 'Designly',
    tags: ['Figma', 'Research', 'Prototyping'],
    logoColor: '#DB2777',
  },
  {
    id: '9',
    employerId: 'emp9',
    title: 'Security Engineer',
    description:
      'Own application security, threat modeling, and secure development practices across a fast-moving engineering org. Help teams ship confidently without slowing them down.',
    salary: '$155k – $190k',
    location: 'Denver, CO',
    createdAt: '2024-01-07',
    company: 'SecureWorks Studio',
    tags: ['AppSec', 'Go', 'Cloud'],
    logoColor: '#059669',
  },
  {
    id: '10',
    employerId: 'emp10',
    title: 'Customer Success Engineer',
    description:
      'Work directly with technical customers to onboard, debug integrations, and shape product improvements. Great fit for engineers who enjoy people and product strategy.',
    salary: '$115k – $145k',
    location: 'Remote',
    createdAt: '2024-01-06',
    company: 'LaunchOps',
    tags: ['APIs', 'SQL', 'Communication'],
    logoColor: '#9333EA',
  },
];

export const MOCK_MATCHES: MockMatch[] = [
  {
    id: 'm1',
    userId1: 'current-user',
    userId2: 'emp2',
    createdAt: '2024-01-14',
    jobTitle: 'Product Manager',
    company: 'StartupXYZ',
    matchedAt: '2 days ago',
    logoColor: '#057642',
  },
  {
    id: 'm2',
    userId1: 'current-user',
    userId2: 'emp5',
    createdAt: '2024-01-13',
    jobTitle: 'iOS Engineer',
    company: 'MobileFirst',
    matchedAt: '3 days ago',
    logoColor: '#EA580C',
  },
];

export const MOCK_PROFILE: Profile = {
  userId: 'current-user',
  name: 'Alex Johnson',
  description:
    '5 years building mobile and web apps. Passionate about great UX and clean architecture. Looking for a senior role at a mission-driven company.',
  location: 'San Francisco, CA',
  updatedAt: '2024-01-10',
};

export const MOCK_CANDIDATES: MockCandidate[] = [
  {
    id: 'c1',
    name: 'Priya Sharma',
    title: 'Senior Frontend Engineer',
    description:
      '6 years of experience building scalable web and mobile applications. Deep expertise in React, TypeScript, and design systems. Passionate about accessibility and performance optimization.',
    location: 'San Francisco, CA',
    skills: ['React', 'TypeScript', 'GraphQL', 'Figma'],
    avatarColor: '#0A66C2',
  },
  {
    id: 'c2',
    name: 'Jordan Lee',
    title: 'Full Stack Engineer',
    description:
      'Versatile engineer with 4 years across fintech and healthtech startups. Comfortable owning features end-to-end from database schema to pixel-perfect UI. Loves shipping fast.',
    location: 'Remote',
    skills: ['Node.js', 'React', 'PostgreSQL', 'AWS'],
    avatarColor: '#057642',
  },
  {
    id: 'c3',
    name: 'Marcus Chen',
    title: 'Machine Learning Engineer',
    description:
      'ML engineer with a focus on NLP and recommendation systems. PhD in Computer Science from Stanford. Published researcher with 3 years of production ML experience at a top-10 tech company.',
    location: 'Seattle, WA',
    skills: ['Python', 'PyTorch', 'Kubernetes', 'Spark'],
    avatarColor: '#7C3AED',
  },
  {
    id: 'c4',
    name: 'Sofia Ramirez',
    title: 'Product Manager',
    description:
      'Data-driven PM with 5 years leading 0-to-1 products at consumer startups. Track record of growing DAU by 3x through rigorous experimentation and customer discovery. MBA from Wharton.',
    location: 'New York, NY',
    skills: ['Strategy', 'SQL', 'Amplitude', 'Agile'],
    avatarColor: '#EA580C',
  },
  {
    id: 'c5',
    name: 'Devon Park',
    title: 'iOS Engineer',
    description:
      'iOS engineer with 7 years building consumer apps with millions of downloads. Expert in Swift, SwiftUI, and Core Data. Currently an IC at a Series B startup; seeking a tech lead role.',
    location: 'Austin, TX',
    skills: ['Swift', 'SwiftUI', 'CoreData', 'Instruments'],
    avatarColor: '#0284C7',
  },
  {
    id: 'c6',
    name: 'Amara Osei',
    title: 'Backend Engineer',
    description:
      'Backend engineer specializing in high-throughput distributed systems. Built payment processing infrastructure handling $500M+ in annual transactions. Passionate about reliability and on-call culture.',
    location: 'Chicago, IL',
    skills: ['Go', 'Kafka', 'PostgreSQL', 'GCP'],
    avatarColor: '#CC1016',
  },
  {
    id: 'c7',
    name: 'Nina Patel',
    title: 'Data Engineer',
    description:
      'Data engineer who builds clean batch and streaming pipelines. Recently led a warehouse migration and built self-serve datasets used across sales, finance, and product teams.',
    location: 'Boston, MA',
    skills: ['Spark', 'Airflow', 'dbt', 'Python'],
    avatarColor: '#2563EB',
  },
  {
    id: 'c8',
    name: 'Eli Thompson',
    title: 'Product Designer',
    description:
      'Product designer focused on thoughtful mobile workflows, design systems, and research-backed decisions. Loves pairing with engineers and turning ambiguity into crisp UI.',
    location: 'Los Angeles, CA',
    skills: ['Figma', 'UX Research', 'Design Systems', 'Prototyping'],
    avatarColor: '#DB2777',
  },
  {
    id: 'c9',
    name: 'Rafael Costa',
    title: 'Security Engineer',
    description:
      'Security engineer with a developer-first approach. Experience with AppSec reviews, cloud hardening, incident response, and building tooling that engineers actually use.',
    location: 'Denver, CO',
    skills: ['AppSec', 'AWS', 'Go', 'Threat Modeling'],
    avatarColor: '#059669',
  },
  {
    id: 'c10',
    name: 'Maya Nguyen',
    title: 'Customer Success Engineer',
    description:
      'Technical customer success engineer with strong API debugging skills and a calm communication style. Bridges support, sales, product, and engineering with clear context.',
    location: 'Remote',
    skills: ['APIs', 'SQL', 'Node.js', 'Customer Discovery'],
    avatarColor: '#9333EA',
  },
];

export interface MockMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  time: string;
}

export const MOCK_MESSAGES: Record<string, MockMessage[]> = {
  m1: [
    { id: 'msg1', matchId: 'm1', senderId: 'emp2',         content: "Hi! We loved your profile — are you open to a quick call this week?", time: '10:30 AM' },
    { id: 'msg2', matchId: 'm1', senderId: 'current-user', content: "Thanks! Yes, definitely interested. What times work for you?",           time: '10:32 AM' },
    { id: 'msg3', matchId: 'm1', senderId: 'emp2',         content: "How about Thursday at 2 PM PST?",                                        time: '10:35 AM' },
    { id: 'msg4', matchId: 'm1', senderId: 'current-user', content: "Thursday works perfectly. I'll send a calendar invite.",                 time: '10:36 AM' },
  ],
  m2: [
    { id: 'msg5', matchId: 'm2', senderId: 'emp5',         content: "Hey! Great to connect. Your iOS experience looks really impressive.",    time: 'Yesterday' },
    { id: 'msg6', matchId: 'm2', senderId: 'current-user', content: "Thank you! I'm excited about the role. Would love to learn more.",      time: 'Yesterday' },
  ],
};
