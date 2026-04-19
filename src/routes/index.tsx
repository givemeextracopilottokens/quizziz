import { createFileRoute, Link } from '@tanstack/react-router';
import {
  IconRocket,
  IconArrowRight,
  IconBolt,
  IconTarget,
  IconTrendingUp,
  IconLogin,
} from '@tabler/icons-react';
import { Button } from '~/components/ui/button';

const mockFriends = [
  { initials: 'JD', color: 'bg-red-600', name: 'John Doe' },
  { initials: 'SM', color: 'bg-blue-600', name: 'Sarah Miller' },
  { initials: 'LP', color: 'bg-purple-600', name: 'Leo Park' },
  { initials: 'AK', color: 'bg-amber-600', name: 'Alex Kim' },
  { initials: 'EN', color: 'bg-green-600', name: 'Emma Nixon' },
  { initials: 'RC', color: 'bg-pink-600', name: 'Ryan Carter' },
];

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Gradient background - only top 70vh */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
        style={{
          height: '70vh',
          background: `linear-gradient(180deg, rgba(30, 80, 50, 1) 0%, rgba(50, 120, 80, 0.8) 20%, rgba(80, 160, 100, 0.6) 40%, rgba(100, 200, 130, 0.5) 60%, rgba(70, 150, 90, 0.4) 80%, rgba(10, 10, 10, 1) 100%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
        style={{ height: '70vh' }}
      >
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-lime-600/10 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconRocket size={32} className="text-lime-400" />
              <span className="text-2xl font-bold text-white">Quizziz</span>
            </div>

            {/* Friends Avatar Group */}
            <div className="hidden flex-1 items-center justify-center gap-3 md:flex">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-neutral-300">
                  Friends learning
                </span>
                <span className="text-xs text-lime-400">+2.3K online</span>
              </div>
              <div className="flex items-center -space-x-2">
                {mockFriends.map((friend, idx) => (
                  <div
                    key={idx}
                    className={`group relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-neutral-900 text-xs font-semibold text-white transition-all hover:z-20 hover:scale-125 ${friend.color} cursor-pointer`}
                    title={friend.name}
                  >
                    {friend.initials}
                    <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {friend.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link to="/sign-in">
              <Button
                className="gap-2 bg-lime-600 text-white hover:bg-lime-500"
                size="sm"
              >
                <IconLogin size={16} />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Main Hero */}
        <div className="mb-20 text-center">
          <style>{`
            @keyframes typewriter {
              0% {
                width: 0;
              }
              100% {
                width: 100%;
              }
            }
            @keyframes blink {
              0%, 49% {
                border-right-color: rgba(132, 204, 22, 1);
              }
              50%, 100% {
                border-right-color: transparent;
              }
            }
            .typewriter {
              overflow: hidden;
              border-right: 2px solid rgba(132, 204, 22, 1);
              white-space: nowrap;
              animation: typewriter 4s steps(50, end) infinite, blink 0.7s step-end infinite;
            }
          `}</style>
          <h1 className="mb-6 text-5xl font-bold text-white drop-shadow-lg md:text-6xl">
            <span className="typewriter inline-block">
              Master Your Knowledge
            </span>
            <span className="block bg-linear-to-r from-lime-400 to-blue-400 bg-clip-text text-transparent">
              One Quiz at a Time
            </span>
          </h1>
          <p className="mb-8 text-lg text-neutral-400 md:text-xl">
            Create engaging quizzes, track your progress, and unlock your
            learning potential with interactive assessments.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link to="/dashboard">
              <Button
                size="lg"
                className="gap-2 bg-lime-600 text-white hover:bg-lime-500"
              >
                Get Started
                <IconArrowRight size={20} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="relative mb-20 rounded-lg border border-neutral-800 bg-neutral-900/70 p-12 backdrop-blur-md">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">
              Why Choose Quizziz?
            </h2>
            <p className="text-neutral-400">
              Everything you need for effective learning and assessment
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Feature Card 1 */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm transition-all hover:border-lime-600/30 hover:bg-neutral-900/80">
              <div className="mb-4 inline-flex rounded-lg bg-lime-600/10 p-3">
                <IconBolt size={24} className="text-lime-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Quick Creation
              </h3>
              <p className="text-sm text-neutral-400">
                Create quizzes in minutes with our intuitive builder. Support
                for multiple question types.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm transition-all hover:border-lime-600/30 hover:bg-neutral-900/80">
              <div className="mb-4 inline-flex rounded-lg bg-blue-600/10 p-3">
                <IconTrendingUp size={24} className="text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Track Progress
              </h3>
              <p className="text-sm text-neutral-400">
                Monitor your improvement over time with detailed analytics and
                performance insights.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm transition-all hover:border-lime-600/30 hover:bg-neutral-900/80">
              <div className="mb-4 inline-flex rounded-lg bg-purple-600/10 p-3">
                <IconTarget size={24} className="text-purple-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Adaptive Learning
              </h3>
              <p className="text-sm text-neutral-400">
                Focus on areas that need improvement with intelligent question
                randomization.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-20 rounded-lg border border-neutral-800 bg-neutral-900/50 p-12 backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <p className="mb-2 text-4xl font-bold text-lime-400">10K+</p>
              <p className="text-neutral-400">Quizzes Created</p>
            </div>
            <div className="text-center">
              <p className="mb-2 text-4xl font-bold text-lime-400">50K+</p>
              <p className="text-neutral-400">Active Learners</p>
            </div>
            <div className="text-center">
              <p className="mb-2 text-4xl font-bold text-lime-400">1M+</p>
              <p className="text-neutral-400">Questions Answered</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-lg border border-lime-600/30 bg-lime-600/5 p-12 text-center backdrop-blur-sm">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to Start Learning?
          </h2>
          <p className="mb-8 text-neutral-400">
            Create your first quiz or explore existing ones from our community.
          </p>
          <Link to="/dashboard">
            <Button
              size="lg"
              className="gap-2 bg-lime-600 text-white hover:bg-lime-500"
            >
              Go to Dashboard
              <IconArrowRight size={20} />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-neutral-800 bg-neutral-950/80 py-8 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-neutral-500">
            © 2026 Quizziz. All rights reserved. Master your knowledge.
          </p>
        </div>
      </div>
    </div>
  );
}
