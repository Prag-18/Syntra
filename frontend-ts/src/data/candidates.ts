import { Candidate } from '../types';

export const DEFAULT_JD = `Senior full-stack engineer to lead a payments infrastructure team. Owns design and delivery of core payment rails, mentors a team of 4 engineers, works closely with product and compliance. Must have strong system design skills, experience with distributed systems, ideally payments or fintech background. Python or Go backend, React frontend. Values clear communicators who can translate complex technical decisions to non-technical stakeholders.`;

export const SAMPLE_CANDIDATES: Candidate[] = [
  {
    id: "cand-1",
    full_name: "Priya Mehta",
    current_role: "Senior Engineer",
    company: "Razorpay",
    years_experience: 6,
    skills: ["Python", "React", "Payments", "Redis", "Fraud Detection"],
    bio: "Senior engineer leading core transactional processing services. Scaled payment engine during high-concurrency peak sales.",
    mentoring_signals: "Mentors 3 juniors regularly, conducts weekly internal tech talks.",
    communication_signals: "Very clear, structured presentation style.",
    system_design_score: 82,
    coding_score: 78,
    communication_score: 90,
    referral_notes: "Strong recommendation from VP Engineering."
  },
  {
    id: "cand-2",
    full_name: "David Kim",
    current_role: "Staff Engineer",
    company: "Meta",
    years_experience: 9,
    skills: ["Go", "Kafka", "Distributed Systems", "C++", "Flink", "Kubernetes"],
    bio: "Designed high-throughput Kafka streaming pipeline handling 10M QPS.",
    mentoring_signals: "Leads architecture reviews for 20+ engineers.",
    communication_signals: "Technical docs are dense and hard for non-technical stakeholders.",
    system_design_score: 97,
    coding_score: 95,
    communication_score: 65
  },
  {
    id: "cand-3",
    full_name: "Aisha Okonkwo",
    current_role: "Engineering Tech Lead",
    company: "Flutterwave",
    years_experience: 7,
    skills: ["Python", "Go", "React", "Fintech", "Cross-border Payments", "Team Leadership"],
    bio: "Led 12-person engineering team delivering multi-currency payout infrastructure.",
    mentoring_signals: "Formal mentor to 8 engineers with 3 recent promotions.",
    communication_signals: "Keynote speaker at regional fintech tech summits.",
    public_presence: "Keynote speaker, active tech writer",
    system_design_score: 85,
    coding_score: 80,
    communication_score: 96
  },
  {
    id: "cand-4",
    full_name: "Tom Brandt",
    current_role: "Backend Developer",
    company: "FinStartup",
    years_experience: 3,
    skills: ["Node.js", "Python", "AWS", "Stripe API", "PostgreSQL", "Docker"],
    bio: "Built payment gateway integrations using Stripe and PayPal APIs.",
    mentoring_signals: "No direct mentoring experience.",
    communication_signals: "Good communicator in small team setups.",
    system_design_score: 58,
    coding_score: 72,
    communication_score: 80
  },
  {
    id: "cand-5",
    full_name: "Lin Wei",
    current_role: "Platform Engineer",
    company: "Grab",
    years_experience: 5,
    skills: ["Go", "Kubernetes", "gRPC", "Payments", "Microservices", "System Design"],
    bio: "Maintains GrabPay core wallet microservices processing 5M daily transactions.",
    mentoring_signals: "Informal mentor to 2 teammates.",
    communication_signals: "Direct and straightforward written communication.",
    system_design_score: 88,
    coding_score: 85,
    communication_score: 78
  },
  {
    id: "cand-6",
    full_name: "Sara Johansson",
    current_role: "Full Stack Engineer",
    company: "Klarna",
    years_experience: 8,
    skills: ["React", "TypeScript", "Python", "BNPL", "Fintech", "API Design"],
    bio: "Full stack owner for checkout flow optimization. Led frontend guild across 4 teams.",
    mentoring_signals: "Mentors frontend developers across the org.",
    communication_signals: "Authored 4 engineering blog posts on web performance.",
    public_presence: "4 engineering blog posts",
    system_design_score: 72,
    coding_score: 75,
    communication_score: 94
  }
];