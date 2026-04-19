import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import z from 'zod';
import {
  IconRocket,
  IconFlame,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconX,
  IconClock,
  IconStar,
  IconBulb,
  IconDice,
} from '@tabler/icons-react';

import { loadQuiz } from '~/lib/actions/load-quiz';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Skeleton } from '~/components/ui/skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const SearchParams = z.object({
  randomizeAnswers: z
    .preprocess(
      value =>
        value === 'true' || value === '1' || value === true || value === 'yes',
      z.boolean(),
    )
    .default(true)
    .catch(true),
  randomizeQuestions: z
    .preprocess(
      value =>
        value === 'true' || value === '1' || value === true || value === 'yes',
      z.boolean(),
    )
    .default(true)
    .catch(true),
});

export const Route = createFileRoute('/play/$projectId')({
  validateSearch: SearchParams,
  component: RouteComponent,
});

interface QuizQuestion {
  title: string;
  type: 'boolean' | 'standard' | 'input';
  explanation: string;
  allowedTime: number;
  doublePoints: boolean;
  answers: { text: string; isCorrect: boolean }[];
}

interface QuizData {
  project: {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  questions: QuizQuestion[];
}

interface QuizAttempt {
  timestamp: number;
  score: number;
  correctCount: number;
  totalCount: number;
}

interface UserAnswer {
  questionIndex: number;
  selectedAnswers: number[];
  textAnswer?: string;
  submittedAt: number;
  userProvidedAnswer?: string; // Store formatted user answer for results
}

type QuizState = 'loading' | 'start' | 'playing' | 'answering' | 'results';

function RouteComponent() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [originalQuizData, setOriginalQuizData] = useState<QuizData | null>(
    null,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [currentSelectedAnswers, setCurrentSelectedAnswers] = useState<
    number[]
  >([]);
  const [currentTextAnswer, setCurrentTextAnswer] = useState('');
  const currentSelectedAnswersRef = useRef<number[]>([]);
  const currentTextAnswerRef = useRef('');
  const updateCurrentSelectedAnswers = useCallback((answers: number[]) => {
    currentSelectedAnswersRef.current = answers;
    setCurrentSelectedAnswers(answers);
  }, []);
  const updateCurrentTextAnswer = useCallback((value: string) => {
    currentTextAnswerRef.current = value;
    setCurrentTextAnswer(value);
  }, []);
  const [randomizeAnswers, setRandomizeAnswers] = useState(
    search.randomizeAnswers ?? true,
  );
  const [randomizeQuestions, setRandomizeQuestions] = useState(
    search.randomizeQuestions ?? true,
  );
  const timeRef = useRef<number>(null);

  // Sync toggle state with search params
  const updateSearch = useCallback(
    (params: Partial<z.infer<typeof SearchParams>>) => {
      navigate({
        to: '/play/$projectId',
        params: { projectId },
        search: prev => ({
          ...prev,
          ...params,
        }),
      });
    },
    [navigate, projectId],
  );

  useEffect(() => {
    setRandomizeAnswers(search.randomizeAnswers ?? true);
    setRandomizeQuestions(search.randomizeQuestions ?? true);
  }, [search.randomizeAnswers, search.randomizeQuestions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasRandomizeAnswers = params.has('randomizeAnswers');
    const hasRandomizeQuestions = params.has('randomizeQuestions');

    if (!hasRandomizeAnswers || !hasRandomizeQuestions) {
      updateSearch({
        randomizeAnswers,
        randomizeQuestions,
      });
    }
  }, [randomizeAnswers, randomizeQuestions, updateSearch]);

  // Load quiz data
  useEffect(() => {
    const loadData = async () => {
      const result = await loadQuiz({ data: { projectId } });
      if (result.success && result.data) {
        setOriginalQuizData(result.data);
        setQuizData(result.data);
        setQuizState('start');
        // Load attempts from localStorage
        const stored = localStorage.getItem(`quiz_${projectId}_attempts`);
        setAttempts(stored ? JSON.parse(stored) : []);
      }
    };
    loadData();
  }, [projectId]);

  const handleStartQuiz = useCallback(() => {
    if (!originalQuizData) return;

    let questionsToUse = [...originalQuizData.questions];

    // Randomize questions if needed
    if (randomizeQuestions) {
      questionsToUse = questionsToUse.sort(() => Math.random() - 0.5);
    }

    // Randomize answers if needed
    if (randomizeAnswers) {
      questionsToUse = questionsToUse.map(q => ({
        ...q,
        answers: [...q.answers].sort(() => Math.random() - 0.5),
      }));
    }

    const newQuizData = { ...originalQuizData, questions: questionsToUse };
    setQuizData(newQuizData);

    const question = newQuizData.questions[0];
    const timeLimit = question.allowedTime > 0 ? question.allowedTime : 0;
    setTimeLeft(timeLimit);
    updateCurrentSelectedAnswers([]);
    updateCurrentTextAnswer('');
    setQuestionStartTime(Date.now());
    setQuizState('playing');
  }, [
    originalQuizData,
    randomizeAnswers,
    randomizeQuestions,
    updateCurrentSelectedAnswers,
    updateCurrentTextAnswer,
  ]);

  const calculatePoints = (
    isCorrect: boolean,
    timeTaken: number,
    allowedTime: number,
    doublePoints: boolean,
  ): number => {
    if (!isCorrect) return 0;

    const basePoints = doublePoints ? 200 : 100;
    const bonusWindow = 3;

    if (allowedTime === 0) {
      return basePoints;
    }

    const timeRemaining = allowedTime - timeTaken;

    if (timeRemaining >= allowedTime - bonusWindow) {
      return basePoints;
    }

    const ratio = Math.max(0, timeRemaining) / allowedTime;
    return Math.round(basePoints * ratio);
  };

  const handleSubmitAnswer = useCallback(
    (selectedAnswers: number[], textAnswer?: string) => {
      if (!quizData) return;

      const question = quizData.questions[currentQuestionIndex];
      const timeTaken = (Date.now() - questionStartTime) / 1000;

      let isCorrect = false;
      if (question.type === 'input') {
        isCorrect =
          textAnswer?.toLowerCase().trim() ===
          question.answers[0].text.toLowerCase().trim();
      } else {
        const correctIndices = question.answers
          .map((a, i) => (a.isCorrect ? i : -1))
          .filter(i => i !== -1);
        isCorrect =
          selectedAnswers.length === correctIndices.length &&
          selectedAnswers.every(i => correctIndices.includes(i));
      }

      const earnedPoints = calculatePoints(
        isCorrect,
        timeTaken,
        question.allowedTime,
        question.doublePoints,
      );

      setUserAnswers(prev => [
        ...prev,
        {
          questionIndex: currentQuestionIndex,
          selectedAnswers,
          textAnswer,
          submittedAt: earnedPoints,
          userProvidedAnswer:
            question.type === 'input'
              ? textAnswer || 'No answer'
              : selectedAnswers.map(i => question.answers[i].text).join(', ') ||
                'No answer',
        },
      ]);

      setScore(prev => prev + earnedPoints);
      setQuizState('answering');
    },
    [currentQuestionIndex, quizData, questionStartTime],
  );

  const handleTimeUp = useCallback(() => {
    if (!quizData) return;

    handleSubmitAnswer(
      currentSelectedAnswersRef.current,
      currentTextAnswerRef.current,
    );
  }, [quizData, handleSubmitAnswer]);

  useEffect(() => {
    if (quizState !== 'playing' || !quizData) return;

    const question = quizData.questions[currentQuestionIndex];
    if (!question || question.allowedTime === 0) return;

    let startTime = Date.now();
    const initialTimeLeft = question.allowedTime;

    const animateTimer = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, initialTimeLeft - elapsed);

      setTimeLeft(remaining);

      if (remaining <= 0) {
        setTimeLeft(0);
        handleTimeUp();
        return;
      }

      timeRef.current = requestAnimationFrame(animateTimer);
    };

    timeRef.current = requestAnimationFrame(animateTimer);
    return () => {
      if (timeRef.current) {
        cancelAnimationFrame(timeRef.current);
      }
    };
  }, [quizState, currentQuestionIndex, quizData, handleTimeUp]);

  const handleNextQuestion = useCallback(() => {
    if (!quizData) return;

    if (currentQuestionIndex < quizData.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      const question = quizData.questions[nextIndex];
      setCurrentQuestionIndex(nextIndex);
      const timeLimit = question.allowedTime > 0 ? question.allowedTime : 0;
      setTimeLeft(timeLimit);
      updateCurrentSelectedAnswers([]);
      updateCurrentTextAnswer('');
      setQuestionStartTime(Date.now());
      setQuizState('playing');
    } else {
      // Quiz finished
      const correctCount = calculateCorrectCount();
      const attempt: QuizAttempt = {
        timestamp: Date.now(),
        score,
        correctCount,
        totalCount: quizData.questions.length,
      };
      const newAttempts = [...attempts, attempt];
      setAttempts(newAttempts);
      localStorage.setItem(
        `quiz_${projectId}_attempts`,
        JSON.stringify(newAttempts),
      );
      setQuizState('results');
    }
  }, [currentQuestionIndex, quizData, score, attempts, projectId]);

  const calculateCorrectCount = (): number => {
    if (!quizData) return 0;
    return quizData.questions.reduce((count, question, index) => {
      const userAnswer = userAnswers.find(a => a.questionIndex === index);
      if (!userAnswer) return count;

      if (question.type === 'input') {
        return (
          count +
          (userAnswer.textAnswer?.toLowerCase().trim() ===
          question.answers[0].text.toLowerCase().trim()
            ? 1
            : 0)
        );
      } else {
        const correctIndices = question.answers
          .map((a, i) => (a.isCorrect ? i : -1))
          .filter(i => i !== -1);
        return (
          count +
          (userAnswer.selectedAnswers.length === correctIndices.length &&
          userAnswer.selectedAnswers.every(i => correctIndices.includes(i))
            ? 1
            : 0)
        );
      }
    }, 0);
  };

  const currentQuestion =
    quizData && quizState !== 'start'
      ? quizData.questions[currentQuestionIndex]
      : null;
  const currentAnswer = userAnswers.find(
    a => a.questionIndex === currentQuestionIndex,
  );

  if (quizState === 'loading') {
    return (
      <div className="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        {/* Animated gradient background */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-lime-600/5 blur-3xl" />
          <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-purple-600/5 blur-3xl" />
        </div>

        {/* Header skeleton */}
        <div className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Skeleton className="h-8 w-48 bg-neutral-800" />
            <Skeleton className="mt-3 h-5 w-72 bg-neutral-800" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="relative z-10 mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-64 w-full rounded-lg bg-neutral-800" />
          <Skeleton className="h-96 w-full rounded-lg bg-neutral-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Animated gradient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-lime-600/5 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-purple-600/5 blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => navigate({ to: '/explore' })}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800 hover:text-white sm:inline-flex"
              aria-label="Back to home"
            >
              <IconArrowLeft size={18} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="mx-auto inline-flex max-w-full items-center gap-2 text-xl font-bold text-white sm:text-2xl">
                <IconRocket size={24} className="text-lime-400" />
                <span className="truncate">{quizData?.project.title}</span>
              </h1>
              <p className="mx-auto mt-1 max-w-[90vw] text-sm leading-5 text-neutral-400 sm:max-w-none sm:text-base">
                <span className="inline-flex items-center gap-2">
                  <IconFlame size={16} className="text-orange-400" />
                  {quizData?.project.description ||
                    'Test your knowledge with this quiz'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {quizState === 'start' && (
          <StartPage
            attempts={attempts}
            totalQuestions={quizData?.questions.length || 0}
            randomizeAnswers={randomizeAnswers}
            randomizeQuestions={randomizeQuestions}
            onRandomizeAnswersChange={value => {
              setRandomizeAnswers(value);
              updateSearch({ randomizeAnswers: value });
            }}
            onRandomizeQuestionsChange={value => {
              setRandomizeQuestions(value);
              updateSearch({ randomizeQuestions: value });
            }}
            onStart={handleStartQuiz}
          />
        )}

        {quizState === 'playing' && currentQuestion && (
          <QuestionPage
            question={currentQuestion}
            questionIndex={currentQuestionIndex}
            totalQuestions={quizData?.questions.length || 0}
            timeLeft={timeLeft}
            selectedAnswers={currentSelectedAnswers}
            textAnswer={currentTextAnswer}
            onSelectedAnswersChange={updateCurrentSelectedAnswers}
            onTextAnswerChange={updateCurrentTextAnswer}
            onSubmit={handleSubmitAnswer}
          />
        )}

        {quizState === 'answering' && currentQuestion && currentAnswer && (
          <AnswerPage
            question={currentQuestion}
            questionIndex={currentQuestionIndex}
            totalQuestions={quizData?.questions.length || 0}
            userAnswer={currentAnswer}
            earnedPoints={currentAnswer.submittedAt}
            onNext={handleNextQuestion}
          />
        )}

        {quizState === 'results' && quizData && (
          <ResultsPage
            score={score}
            totalQuestions={quizData.questions.length}
            userAnswers={userAnswers}
            questions={quizData.questions}
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
}

interface StartPageProps {
  attempts: QuizAttempt[];
  totalQuestions: number;
  randomizeAnswers: boolean;
  randomizeQuestions: boolean;
  onRandomizeAnswersChange: (value: boolean) => void;
  onRandomizeQuestionsChange: (value: boolean) => void;
  onStart: () => void;
}

function StartPage({
  attempts,
  totalQuestions,
  randomizeAnswers,
  randomizeQuestions,
  onRandomizeAnswersChange,
  onRandomizeQuestionsChange,
  onStart,
}: StartPageProps) {
  const bestAttempt = attempts.length
    ? attempts.reduce((best, current) =>
        current.score > best.score ? current : best,
      )
    : null;

  const averageScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length,
        )
      : 0;

  // Prepare chart data
  const scoreData = attempts.map((attempt, idx) => ({
    attempt: `Attempt ${idx + 1}`,
    score: attempt.score,
    correct: attempt.correctCount,
  }));

  const accuracyData = attempts.map((attempt, idx) => ({
    attempt: `Attempt ${idx + 1}`,
    accuracy: Math.round((attempt.correctCount / attempt.totalCount) * 100),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 text-center backdrop-blur-sm sm:p-12">
        <h2 className="mb-3 text-2xl font-bold text-white">Ready to Start?</h2>
        <p className="mb-8 text-neutral-400">
          Answer all {totalQuestions} questions correctly to earn maximum
          points.
        </p>

        {/* Randomization Options */}
        <div className="mb-6 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => onRandomizeQuestionsChange(!randomizeQuestions)}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 transition-all ${
              randomizeQuestions
                ? 'border-blue-500 bg-blue-600/10 text-blue-300'
                : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <IconDice size={16} />
            Randomize Questions
          </button>
          <button
            onClick={() => onRandomizeAnswersChange(!randomizeAnswers)}
            className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2 transition-all ${
              randomizeAnswers
                ? 'border-red-500 bg-red-600/10 text-red-300'
                : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
            }`}
          >
            <IconDice size={16} />
            Randomize Answers
          </button>
        </div>

        <Button
          onClick={onStart}
          className="gap-2 border-lime-600 bg-lime-600 text-white hover:bg-lime-500"
          size="lg"
        >
          Start Quiz
          <IconArrowRight size={20} />
        </Button>
      </div>

      {attempts.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 backdrop-blur-sm">
          <h3 className="mb-6 text-lg font-semibold text-white">
            Previous Attempts
          </h3>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
              <p className="text-sm text-neutral-400">Total Attempts</p>
              <p className="text-3xl font-bold text-lime-400">
                {attempts.length}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
              <p className="text-sm text-neutral-400">Best Score</p>
              <p className="text-3xl font-bold text-lime-400">
                {bestAttempt?.score || 0}
              </p>
              <p className="text-xs text-neutral-500">
                {bestAttempt?.correctCount}/{totalQuestions} correct
              </p>
            </div>
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
              <p className="text-sm text-neutral-400">Average Score</p>
              <p className="text-3xl font-bold text-lime-400">{averageScore}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Score Chart */}
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
              <p className="mb-4 text-sm font-semibold text-neutral-300">
                Score Progress
              </p>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                  <XAxis dataKey="attempt" stroke="#737373" />
                  <YAxis stroke="#737373" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #404040',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#84cc16"
                    strokeWidth={2}
                    dot={{ fill: '#84cc16' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Accuracy Chart */}
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
              <p className="mb-4 text-sm font-semibold text-neutral-300">
                Accuracy %
              </p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={accuracyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                  <XAxis dataKey="attempt" stroke="#737373" />
                  <YAxis stroke="#737373" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #404040',
                    }}
                  />
                  <Bar
                    dataKey="accuracy"
                    fill="#84cc16"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionPageProps {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  selectedAnswers: number[];
  textAnswer: string;
  onSelectedAnswersChange: (value: number[]) => void;
  onTextAnswerChange: (value: string) => void;
  onSubmit: (selectedAnswers: number[], textAnswer?: string) => void;
}

function QuestionPage({
  question,
  questionIndex,
  totalQuestions,
  timeLeft,
  selectedAnswers,
  textAnswer,
  onSelectedAnswersChange,
  onTextAnswerChange,
  onSubmit,
}: QuestionPageProps) {
  const [textInput, setTextInput] = useState(textAnswer);

  useEffect(() => {
    setTextInput(textAnswer);
  }, [textAnswer]);

  const progressPercentage =
    question.allowedTime > 0 ? (timeLeft / question.allowedTime) * 100 : 0;

  const handleSubmit = () => {
    if (question.type === 'input') {
      onSubmit([], textInput);
    } else {
      onSubmit(selectedAnswers);
    }
  };

  const isAnswered =
    question.type === 'input'
      ? textInput.trim().length > 0
      : selectedAnswers.length > 0;

  const AnswerColors = [
    {
      bg: 'bg-red-950',
      border: 'border-red-700',
      label: 'A',
      labelBg: 'bg-red-600',
    },
    {
      bg: 'bg-blue-950',
      border: 'border-blue-700',
      label: 'B',
      labelBg: 'bg-blue-600',
    },
    {
      bg: 'bg-amber-950',
      border: 'border-amber-700',
      label: 'C',
      labelBg: 'bg-amber-600',
    },
    {
      bg: 'bg-green-950',
      border: 'border-green-700',
      label: 'D',
      labelBg: 'bg-green-600',
    },
    {
      bg: 'bg-purple-950',
      border: 'border-purple-700',
      label: 'E',
      labelBg: 'bg-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Question counter and score */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-neutral-400">
          Question{' '}
          <span className="font-semibold text-white">{questionIndex + 1}</span>{' '}
          of <span className="font-semibold text-white">{totalQuestions}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {question.doublePoints && (
            <Badge className="gap-1 bg-amber-900/50 text-amber-300">
              <IconStar size={12} />
              2x Points
            </Badge>
          )}
          {question.allowedTime > 0 && (
            <Badge className="gap-1 bg-blue-900/50 text-blue-300">
              <IconClock size={12} />
              {Math.ceil(timeLeft)}s
            </Badge>
          )}
        </div>
      </div>

      {/* Timer progress */}
      {question.allowedTime > 0 && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <motion.div
              className="h-full bg-blue-500"
              initial={false}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
            />
          </div>
          <p className="text-xs text-neutral-500">
            {Math.ceil(timeLeft)}s remaining
          </p>
        </div>
      )}

      {/* Question Display */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {question.allowedTime > 0 && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-blue-400 bg-blue-400/10 px-2 text-[10px] font-medium text-blue-400">
              <IconClock size={10} />
              {question.allowedTime}s
            </span>
          )}
          {question.doublePoints && (
            <span className="inline-flex items-center gap-1 rounded-sm border border-amber-700 bg-amber-800/30 px-2 text-[10px] font-medium text-amber-400">
              <IconStar size={10} />
              2x
            </span>
          )}
        </div>

        <h2 className="mb-6 text-xl font-bold text-white sm:text-2xl">
          {question.title}
        </h2>

        {/* Answer Options */}
        <div className="space-y-3">
          {question.type === 'input' ? (
            <input
              type="text"
              placeholder="Enter your answer..."
              value={textInput}
              onChange={e => {
                setTextInput(e.target.value);
                onTextAnswerChange(e.target.value);
              }}
              onKeyDown={e => e.key === 'Enter' && isAnswered && handleSubmit()}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-white placeholder-neutral-500 focus:border-lime-500 focus:outline-none"
              autoFocus
            />
          ) : question.type === 'boolean' ? (
            question.answers.map((answer, idx) => (
              <button
                key={idx}
                onClick={() =>
                  onSelectedAnswersChange(
                    selectedAnswers.includes(idx)
                      ? selectedAnswers.filter(i => i !== idx)
                      : [idx],
                  )
                }
                className={`flex w-full items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                  selectedAnswers.includes(idx)
                    ? 'border-lime-500 bg-lime-600/10'
                    : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded border-2 font-bold ${
                    selectedAnswers.includes(idx)
                      ? 'border-lime-500 bg-lime-500 text-white'
                      : 'border-neutral-600 text-neutral-400'
                  }`}
                >
                  {answer.text === 'True' ? (
                    <IconCheck size={16} />
                  ) : (
                    <IconX size={16} />
                  )}
                </div>
                <span
                  className={`text-lg font-medium ${
                    selectedAnswers.includes(idx)
                      ? 'text-lime-300'
                      : 'text-neutral-300'
                  }`}
                >
                  {answer.text}
                </span>
              </button>
            ))
          ) : (
            question.answers.map((answer, idx) => {
              const color = AnswerColors[idx];
              return (
                <button
                  key={idx}
                  onClick={() =>
                    onSelectedAnswersChange(
                      selectedAnswers.includes(idx)
                        ? selectedAnswers.filter(i => i !== idx)
                        : [...selectedAnswers, idx],
                    )
                  }
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                    selectedAnswers.includes(idx)
                      ? 'border-lime-500 bg-lime-600/10'
                      : `border-neutral-700 bg-neutral-800 hover:border-neutral-600`
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-sm font-bold text-white ${color.labelBg}`}
                  >
                    {color.label}
                  </div>
                  <span className="flex-1 text-left text-neutral-300">
                    {answer.text}
                  </span>
                  {selectedAnswers.includes(idx) && (
                    <IconCheck size={20} className="text-lime-400" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!isAnswered}
          className="mt-8 w-full gap-2 bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-50"
          size="lg"
        >
          Submit Answer
          <IconArrowRight size={20} />
        </Button>
      </div>
    </div>
  );
}

interface AnswerPageProps {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  userAnswer: UserAnswer;
  earnedPoints: number;
  onNext: () => void;
}

function AnswerPage({
  question,
  questionIndex,
  totalQuestions,
  userAnswer,
  earnedPoints,
  onNext,
}: AnswerPageProps) {
  const isCorrect = useMemo(() => {
    if (question.type === 'input') {
      return (
        userAnswer.textAnswer?.toLowerCase().trim() ===
        question.answers[0].text.toLowerCase().trim()
      );
    } else {
      const correctIndices = question.answers
        .map((a, i) => (a.isCorrect ? i : -1))
        .filter(i => i !== -1);
      return (
        userAnswer.selectedAnswers.length === correctIndices.length &&
        userAnswer.selectedAnswers.every(i => correctIndices.includes(i))
      );
    }
  }, [question, userAnswer]);

  const AnswerColors = [
    {
      bg: 'bg-red-950',
      border: 'border-red-700',
      label: 'A',
      labelBg: 'bg-red-600',
    },
    {
      bg: 'bg-blue-950',
      border: 'border-blue-700',
      label: 'B',
      labelBg: 'bg-blue-600',
    },
    {
      bg: 'bg-amber-950',
      border: 'border-amber-700',
      label: 'C',
      labelBg: 'bg-amber-600',
    },
    {
      bg: 'bg-green-950',
      border: 'border-green-700',
      label: 'D',
      labelBg: 'bg-green-600',
    },
    {
      bg: 'bg-purple-950',
      border: 'border-purple-700',
      label: 'E',
      labelBg: 'bg-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
        <p className="line-clamp-2 text-sm text-neutral-400">
          {question.title}
        </p>
      </div>
      {/* Result Header */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center">
        <div className="mb-3 flex justify-center">
          {isCorrect ? (
            <div className="rounded-full bg-green-500/10 p-3">
              <IconCheck size={32} className="text-green-400" />
            </div>
          ) : (
            <div className="rounded-full bg-red-500/10 p-3">
              <IconX size={32} className="text-red-400" />
            </div>
          )}
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </h2>
        <p className="text-lg font-semibold text-lime-400">
          +{earnedPoints} points
        </p>
      </div>

      {/* Correct Answer Display */}
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-8">
        <h3 className="mb-4 text-sm font-semibold text-neutral-400 uppercase">
          Correct Answer
          {question.type !== 'input' &&
          question.answers.filter(a => a.isCorrect).length > 1
            ? 's'
            : ''}
        </h3>

        {question.type === 'input' ? (
          <div className="rounded-lg border border-green-700/50 bg-green-950/20 p-4">
            <p className="font-mono text-green-300">
              {question.answers[0].text}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {question.answers.map(
              (answer, idx) =>
                answer.isCorrect && (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-green-700/50 bg-green-950/20 p-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-green-600 text-xs font-bold text-white">
                      {question.type === 'boolean' ? (
                        <IconCheck size={14} />
                      ) : (
                        AnswerColors[idx].label
                      )}
                    </div>
                    <span className="text-green-300">{answer.text}</span>
                  </div>
                ),
            )}
          </div>
        )}

        {question.explanation && (
          <>
            <Separator
              orientation="horizontal"
              className="my-6 bg-neutral-700"
            />
            <div className="flex gap-3 rounded-lg bg-lime-500/5 p-4">
              <IconBulb size={20} className="shrink-0 text-lime-500" />
              <p className="text-sm text-neutral-300">{question.explanation}</p>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          onClick={onNext}
          className="flex-1 gap-2 bg-lime-600 text-white hover:bg-lime-500"
          size="lg"
        >
          {questionIndex < totalQuestions - 1 ? 'Next Question' : 'See Results'}
          <IconArrowRight size={20} />
        </Button>
      </div>
    </div>
  );
}

interface ResultsPageProps {
  score: number;
  totalQuestions: number;
  userAnswers: UserAnswer[];
  questions: QuizQuestion[];
  projectId: string;
}

function ResultsPage({
  score,
  totalQuestions,
  userAnswers,
  questions,
}: ResultsPageProps) {
  const getWrongQuestions = () => {
    return userAnswers.filter((answer, index) => {
      const question = questions[index];
      if (question.type === 'input') {
        return (
          answer.textAnswer?.toLowerCase().trim() !==
          question.answers[0].text.toLowerCase().trim()
        );
      } else {
        const correctIndices = question.answers
          .map((a, i) => (a.isCorrect ? i : -1))
          .filter(i => i !== -1);
        return !(
          answer.selectedAnswers.length === correctIndices.length &&
          answer.selectedAnswers.every(i => correctIndices.includes(i))
        );
      }
    });
  };

  const correctCount = totalQuestions - getWrongQuestions().length;
  const wrongQuestions = getWrongQuestions();

  const maxPossibleScore = questions.reduce((total, q) => {
    return total + (q.doublePoints ? 200 : 100);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center sm:p-12">
        <h2 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
          Quiz Complete!
        </h2>
        <p className="mb-8 text-lg text-neutral-400 sm:text-xl">
          Here's how you did
        </p>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-neutral-400">Your Score</p>
            <p className="text-4xl font-bold">
              <span className="text-lime-400">{score}</span>
              <span className="text-neutral-500"> / </span>
              <span className="text-neutral-400">{maxPossibleScore}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Correct Answers</p>
            <p className="text-4xl font-bold text-lime-400">{correctCount}</p>
            <p className="text-xs text-neutral-500">of {totalQuestions}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-400">Accuracy</p>
            <p className="text-4xl font-bold text-lime-400">
              {Math.round((correctCount / totalQuestions) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Wrong Questions */}
      {wrongQuestions.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-8">
          <h3 className="mb-6 text-lg font-semibold text-white">
            Questions to Review
          </h3>
          <div className="space-y-4">
            {wrongQuestions.map((answer, idx) => {
              const question = questions[answer.questionIndex];
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-red-700/30 bg-red-950/20 p-4"
                >
                  <p className="mb-3 line-clamp-2 max-w-full overflow-hidden text-sm font-medium wrap-break-word text-red-300">
                    Question {answer.questionIndex + 1}: {question.title}
                  </p>

                  {/* User Answer */}
                  <div className="mb-3 space-y-1">
                    <p className="text-xs font-medium text-neutral-400">
                      Your Answer:
                    </p>
                    <p className="text-sm text-red-300">
                      {answer.userProvidedAnswer || 'No answer provided'}
                    </p>
                  </div>

                  {/* Correct Answer */}
                  <div className="space-y-1 border-t border-red-700/20 pt-3">
                    <p className="text-xs font-medium text-neutral-400">
                      Correct Answer
                      {question.type !== 'input' &&
                      question.answers.filter(a => a.isCorrect).length > 1
                        ? 's'
                        : ''}
                      :
                    </p>
                    {question.type === 'input' ? (
                      <p className="text-sm text-green-300">
                        {question.answers[0].text}
                      </p>
                    ) : (
                      <p className="text-sm text-green-300">
                        {question.answers
                          .map(a => (a.isCorrect ? a.text : null))
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => window.location.reload()}
          className="flex-1 gap-2 bg-lime-600 text-white hover:bg-lime-500"
          size="lg"
        >
          Retake Quiz
          <IconArrowRight size={20} />
        </Button>
      </div>
    </div>
  );
}
