import { useState, useCallback, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  IconTrash,
  IconPlus,
  IconClock,
  IconStar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconToggleLeft,
  IconListCheck,
  IconItalic,
  IconCircleCheck,
  IconBulb,
  IconCloudDownload,
} from '@tabler/icons-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { Slider } from '~/components/ui/slider';
import { Badge } from '~/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Skeleton } from '~/components/ui/skeleton';
import { Spinner } from '~/components/ui/spinner';
import { saveQuiz } from '~/lib/actions/save-quiz';
import { loadQuiz } from '~/lib/actions/load-quiz';

type QuestionType = 'boolean' | 'standard' | 'input';

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  title: string;
  type: QuestionType;
  answers: Answer[];
  allowedTime: number;
  doublePoints: boolean;
  explanation: string;
}

interface QuizState {
  questions: Question[];
}

const AnswerColors = [
  {
    bg: 'bg-red-950',
    border: 'border-red-700',
    text: 'text-red-300',
    label: 'A',
    labelBg: 'bg-red-600',
  },
  {
    bg: 'bg-blue-950',
    border: 'border-blue-700',
    text: 'text-blue-300',
    label: 'B',
    labelBg: 'bg-blue-600',
  },
  {
    bg: 'bg-amber-950',
    border: 'border-amber-700',
    text: 'text-amber-300',
    label: 'C',
    labelBg: 'bg-amber-600',
  },
  {
    bg: 'bg-green-950',
    border: 'border-green-700',
    text: 'text-green-300',
    label: 'D',
    labelBg: 'bg-green-600',
  },
  {
    bg: 'bg-purple-950',
    border: 'border-purple-700',
    text: 'text-purple-300',
    label: 'E',
    labelBg: 'bg-purple-600',
  },
] as const;

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const createInitialAnswers = (type: QuestionType): Answer[] => {
  if (type === 'boolean') {
    return [
      { id: generateId(), text: 'True', isCorrect: false },
      { id: generateId(), text: 'False', isCorrect: false },
    ];
  }
  if (type === 'input') {
    return [{ id: generateId(), text: '', isCorrect: true }];
  }
  return [
    { id: generateId(), text: '', isCorrect: false },
    { id: generateId(), text: '', isCorrect: false },
  ];
};

interface QuestionDisplayProps {
  question: Question;
}

function QuestionDisplay({ question }: QuestionDisplayProps) {
  const correctCount = question.answers.filter(a => a.isCorrect).length;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg md:max-w-4/5">
      <div className="relative flex h-full flex-col bg-neutral-950 p-8 shadow-2xl shadow-black/30 md:p-10">
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="mb-6 flex flex-wrap items-center gap-2 *:h-5">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-sm border-lime-500 bg-lime-500/10 px-2.5 text-[10px] font-semibold tracking-wider text-lime-500 uppercase"
          >
            <span>?</span>
            <span>Quiz</span>
          </Badge>
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
          {correctCount > 1 && (
            <span className="inline-flex items-center rounded-sm bg-emerald-800/30 px-2 text-[10px] font-medium text-emerald-400">
              Multi-answer
            </span>
          )}
        </div>

        <h2 className="mb-8 text-lg leading-snug font-bold text-balance text-white md:text-2xl">
          {question.title || 'Enter your question'}
        </h2>

        <div className="grid flex-1 gap-2.5 md:grid-cols-2">
          {question.answers.map((answer, idx) => {
            const colorConfig = AnswerColors[idx];
            const isCorrect = answer.isCorrect;
            const isLast = idx === question.answers.length - 1;
            const isOdd = question.answers.length % 2 === 1;
            const shouldSpan = isLast && isOdd;

            const answerCount = question.answers.length;

            const iconSize =
              answerCount <= 2
                ? 'h-14 w-14'
                : answerCount <= 3
                  ? 'h-12 w-12'
                  : 'h-10 w-10';
            const fontSize =
              answerCount <= 2
                ? 'text-base'
                : answerCount <= 3
                  ? 'text-sm'
                  : 'text-xs';
            const iconCheckSize =
              answerCount <= 2 ? 34 : answerCount <= 3 ? 28 : 22;
            const minHeight =
              answerCount <= 2
                ? 'min-h-32'
                : answerCount <= 3
                  ? 'min-h-28'
                  : 'min-h-20';

            return (
              <div
                key={answer.id}
                className={`flex items-center gap-3 rounded px-4 py-3 transition-all ${minHeight} ${
                  shouldSpan ? 'md:col-span-2' : ''
                } ${isCorrect ? 'bg-emerald-500/8' : 'bg-neutral-800/30'}`}
              >
                {question.type !== 'input' && (
                  <span
                    className={`flex ${iconSize} shrink-0 items-center justify-center rounded ${fontSize} font-bold ${
                      isCorrect
                        ? `${colorConfig.labelBg} text-white`
                        : 'bg-neutral-700 text-neutral-400'
                    }`}
                  >
                    {colorConfig.label}
                  </span>
                )}
                <span
                  className={`${answer.text.length === 0 ? 'text-neutral-400' : ''} min-w-0 flex-1 wrap-break-word ${fontSize} leading-snug`}
                >
                  {answer.text.length === 0
                    ? question.type === 'input'
                      ? 'Enter answer...'
                      : `Answer ${colorConfig.label}...`
                    : answer.text}
                </span>
                {isCorrect && (
                  <IconCircleCheck
                    size={iconCheckSize}
                    className="shrink-0 stroke-green-400"
                  />
                )}
              </div>
            );
          })}
        </div>

        {question.explanation && (
          <div className="mt-5 flex items-center gap-4 rounded-lg bg-lime-500/5 p-4">
            <div className="mt-0.5 shrink-0 text-lime-500">
              <IconBulb />
            </div>
            <p className="text-xs leading-relaxed font-medium text-neutral-300">
              {question.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface QuestionThumbnailProps {
  question: Question;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function SortableQuestionThumbnail({
  question,
  index,
  isActive,
  onClick,
}: QuestionThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...attributes}
      {...listeners}
      className={`flex w-full flex-col gap-1.5 rounded-lg border-2 p-3 text-left transition-all ${
        isActive
          ? 'border-green-500 bg-green-950'
          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-semibold ${isActive ? 'text-green-400' : 'text-neutral-400'}`}
      >
        <span>Q{index + 1}</span>
        {question.doublePoints && (
          <div className="flex items-center justify-center rounded bg-amber-900/50 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
            ⭐ 2x
          </div>
        )}
      </div>
      <div
        className={`mb-1 line-clamp-2 text-sm font-medium ${
          isActive ? 'text-green-100' : 'text-neutral-300'
        }`}
      >
        {question.title || 'Untitled'}
      </div>

      {question.type !== 'input' && question.answers.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {question.answers.map((answer, idx) => {
            const color = AnswerColors[idx];
            const isLast = idx === question.answers.length - 1;
            const isOdd = question.answers.length % 2 === 1;
            const shouldSpan = isLast && isOdd;
            const label =
              question.type === 'boolean' ? answer.text : color.label;
            return (
              <div
                key={answer.id}
                className={`flex h-6 items-center justify-center rounded text-xs font-bold ${
                  answer.isCorrect
                    ? `${color.labelBg} text-white`
                    : 'bg-neutral-600 text-neutral-300'
                } ${shouldSpan ? 'col-span-2' : ''}`}
              >
                {label}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

function QuestionThumbnail(props: QuestionThumbnailProps) {
  return <SortableQuestionThumbnail {...props} />;
}

interface NavigationPanelProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  onTitleChange: (title: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onDelete: (questionId: string) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  hasChanges?: boolean;
}

function NavigationPanel({
  question,
  currentIndex,
  totalQuestions,
  onTitleChange,
  onPrevious,
  onNext,
  onDelete,
  onSave,
  isSaving = false,
  hasChanges = false,
}: NavigationPanelProps) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-6 py-3">
      <Button
        size="sm"
        className="gap-2 border-lime-600 bg-lime-600 text-white hover:bg-lime-500 disabled:opacity-50"
        onClick={onSave}
        disabled={isSaving || !hasChanges}
      >
        {isSaving ? (
          <>
            <Spinner className="size-4" />
            Saving...
          </>
        ) : (
          <>
            <IconCloudDownload size={16} />
            Save project
          </>
        )}
      </Button>
      <Input
        placeholder="Question"
        value={question.title}
        onChange={e => onTitleChange(e.target.value)}
        className="h-8 flex-1 border-none bg-transparent! text-sm text-white placeholder-neutral-500"
      />
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="size-6 p-0 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-50"
        >
          <IconChevronLeft size={16} />
        </Button>
        <span className="text-xs whitespace-nowrap text-neutral-400">
          {currentIndex + 1} / {totalQuestions}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={currentIndex === totalQuestions - 1}
          className="size-6 p-0 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-50"
        >
          <IconChevronRight size={16} />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(question.id)}
          className="h-8 w-8 p-0"
        >
          <IconTrash size={16} />
        </Button>
      </div>
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  hideSeparator?: boolean;
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  hideSeparator = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="grid gap-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full cursor-pointer items-center justify-between"
      >
        <span className="text-base font-semibold text-neutral-100">
          {title}
        </span>
        <IconChevronDown
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          size={18}
        />
      </button>
      {isOpen && <div className="grid gap-3">{children}</div>}
      {!hideSeparator && (
        <Separator orientation="horizontal" className="bg-neutral-800" />
      )}
    </div>
  );
}

interface PropertiesPanelProps {
  question: Question;
  onUpdate: (question: Question) => void;
}

function PropertiesPanel({ question, onUpdate }: PropertiesPanelProps) {
  const handleTypeChange = useCallback(
    (newType: QuestionType) => {
      onUpdate({
        ...question,
        type: newType,
        answers: createInitialAnswers(newType),
      });
    },
    [question, onUpdate],
  );

  const handleAnswerUpdate = useCallback(
    (answerId: string, updates: Partial<Answer>) => {
      onUpdate({
        ...question,
        answers: question.answers.map(ans =>
          ans.id === answerId ? { ...ans, ...updates } : ans,
        ),
      });
    },
    [question, onUpdate],
  );

  const handleAddAnswer = useCallback(() => {
    if (question.type !== 'standard' || question.answers.length >= 5) {
      return;
    }
    onUpdate({
      ...question,
      answers: [
        ...question.answers,
        { id: generateId(), text: '', isCorrect: false },
      ],
    });
  }, [question, onUpdate]);

  const handleRemoveAnswer = useCallback(
    (answerId: string) => {
      const minAnswers =
        question.type === 'boolean' ? 2 : question.type === 'input' ? 1 : 2;
      if (question.answers.length <= minAnswers) {
        return;
      }
      onUpdate({
        ...question,
        answers: question.answers.filter(ans => ans.id !== answerId),
      });
    },
    [question, onUpdate],
  );

  const handleToggleCorrect = useCallback(
    (answerId: string) => {
      if (question.type === 'boolean' || question.type === 'input') {
        onUpdate({
          ...question,
          answers: question.answers.map(ans => ({
            ...ans,
            isCorrect: ans.id === answerId ? !ans.isCorrect : false,
          })),
        });
      } else {
        const answer = question.answers.find(ans => ans.id === answerId);
        handleAnswerUpdate(answerId, { isCorrect: !answer?.isCorrect });
      }
    },
    [question.type, handleAnswerUpdate, onUpdate],
  );

  const typeOptions = [
    {
      type: 'boolean',
      label: 'True / False',
      icon: IconToggleLeft,
    },
    {
      type: 'standard',
      label: 'Multiple Choice',
      icon: IconListCheck,
    },
    {
      type: 'input',
      label: 'Free Text',
      icon: IconItalic,
    },
  ] as const;

  return (
    <aside className="flex w-80 flex-col overflow-hidden bg-neutral-950">
      <div className="flex-1 space-y-4 overflow-y-auto border-l border-neutral-800 p-4">
        <CollapsibleSection title="Type" defaultOpen>
          <RadioGroup value={question.type} onValueChange={handleTypeChange}>
            {typeOptions.map(({ type, label, icon: Icon }) => {
              const isSelected = question.type === type;
              const colorMap = {
                boolean: { border: 'border-blue-500', icon: 'text-blue-400' },
                standard: {
                  border: 'border-purple-500',
                  icon: 'text-purple-400',
                },
                input: { border: 'border-orange-500', icon: 'text-orange-400' },
              };
              const colors = colorMap[type];
              return (
                <Card
                  key={type}
                  className={`relative cursor-pointer overflow-hidden border-2 p-3 transition-all ${
                    isSelected
                      ? `${colors.border} bg-neutral-900`
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                  }`}
                  onClick={() => handleTypeChange(type)}
                >
                  <div
                    className={`absolute inset-0 opacity-5 transition-opacity ${
                      isSelected ? 'opacity-10' : 'opacity-0'
                    }`}
                  >
                    <Icon size={120} className="absolute -right-4 -bottom-4" />
                  </div>
                  <div className="relative flex items-center gap-3">
                    <RadioGroupItem value={type} className="hidden" />
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded border-2 ${
                        isSelected
                          ? `${colors.border} ${colors.icon} bg-neutral-800`
                          : 'border-neutral-700 text-neutral-500'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-xs font-semibold ${
                          isSelected ? colors.icon : 'text-neutral-400'
                        }`}
                      >
                        {label}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </RadioGroup>
        </CollapsibleSection>

        <CollapsibleSection title="Answers" defaultOpen>
          {question.type === 'input' ? (
            <div className="grid gap-3">
              <label className="text-xs font-medium text-neutral-400">
                Correct Answer
              </label>
              <Input
                placeholder="Enter the correct answer..."
                value={question.answers[0]?.text || ''}
                onChange={e =>
                  handleAnswerUpdate(question.answers[0].id, {
                    text: e.target.value,
                  })
                }
                className="h-8 border-neutral-700 bg-neutral-900 text-xs text-white placeholder-neutral-500"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {question.answers.map((answer, answerIndex) => {
                const colorConfig = AnswerColors[answerIndex];
                const isCorrect = answer.isCorrect;
                const isBooleanType = question.type === 'boolean';

                return (
                  <div
                    key={answer.id}
                    className={`flex items-center gap-1.5 rounded-sm p-2 transition-all ${
                      isCorrect ? 'bg-green-950' : 'bg-neutral-900/30'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleCorrect(answer.id)}
                      className="shrink-0 transition-colors"
                    >
                      {isCorrect ? (
                        <IconCircleCheck
                          size={16}
                          className="stroke-green-400"
                        />
                      ) : (
                        <div className="flex h-4 w-4 items-center justify-center rounded-sm border-2 border-neutral-700 text-xs text-neutral-600" />
                      )}
                    </button>

                    <span
                      className={`${isCorrect ? colorConfig.labelBg : 'bg-neutral-900'} flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold text-white`}
                    >
                      {colorConfig.label}
                    </span>

                    <Input
                      value={answer.text}
                      onChange={e =>
                        handleAnswerUpdate(answer.id, { text: e.target.value })
                      }
                      placeholder={`Answer ${colorConfig.label}...`}
                      disabled={isBooleanType}
                      className={`h-7 flex-1 border-none bg-neutral-900! text-xs text-white placeholder-neutral-500 ${
                        isBooleanType ? 'cursor-not-allowed opacity-60' : ''
                      }`}
                    />

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveAnswer(answer.id)}
                      disabled={
                        (question.type === 'boolean' &&
                          question.answers.length <= 2) ||
                        (question.type === 'standard' &&
                          question.answers.length <= 2) ||
                        (question.type === 'input' &&
                          question.answers.length <= 1)
                      }
                      className={`${isCorrect ? '' : 'bg-transparent!'} h-6 w-6 p-0 hover:cursor-pointer`}
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {question.type === 'standard' && question.answers.length < 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddAnswer}
              className="w-full gap-1 border-neutral-700 text-xs text-neutral-400 hover:border-neutral-600 hover:bg-neutral-900"
            >
              <IconPlus size={14} /> Add Option
            </Button>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Explanation" defaultOpen={false}>
          <div className="space-y-2">
            <textarea
              placeholder="Explain the correct answer..."
              value={question.explanation || ''}
              onChange={e =>
                onUpdate({ ...question, explanation: e.target.value })
              }
              className="min-h-20 w-full rounded-md border border-neutral-700 bg-neutral-900 p-2 text-xs text-white placeholder-neutral-500 outline-none"
            />
            <p className="text-[9px] text-neutral-600">
              Shown after user answers
            </p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Extras" defaultOpen={false} hideSeparator>
          <div className="space-y-4">
            <div>
              <label className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-300">
                <IconClock size={14} />
                Time Limit (seconds)
              </label>
              <Slider
                value={[question.allowedTime]}
                onValueChange={values =>
                  onUpdate({
                    ...question,
                    allowedTime: Array.isArray(values) ? values[0] : values,
                  })
                }
                min={0}
                max={300}
                step={5}
                className="w-full [--primary:var(--color-blue-400)]"
              />
              <div className="mt-3 flex items-center justify-between rounded-md bg-neutral-900 px-2 py-1.5">
                <span className="text-xs text-neutral-400">Time:</span>
                <span className="font-mono text-sm font-semibold text-blue-400">
                  {question.allowedTime === 0
                    ? 'Unlimited'
                    : `${question.allowedTime}s`}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-300">
                <IconStar size={14} />
                Points Multiplier
              </label>
              <button
                onClick={() =>
                  onUpdate({
                    ...question,
                    doublePoints: !question.doublePoints,
                  })
                }
                className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  question.doublePoints
                    ? 'border-amber-600 bg-amber-950 text-amber-200'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                {question.doublePoints ? '⭐ 2x Points' : '☆ 1x Points'}
              </button>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </aside>
  );
}

export const Route = createFileRoute('/dashboard/project/$projectId/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { projectId } = Route.useParams();
  const navigate = Route.useNavigate();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [_projectTitle, setProjectTitle] = useState('Untitled Project');
  const [quiz, setQuiz] = useState<QuizState>({ questions: [] });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    const loadQuizData = async () => {
      setIsLoading(true);
      const result = await loadQuiz({ data: { projectId } });

      if (result.success && result.data) {
        const transformedQuestions = result.data.questions.map(q => ({
          id: generateId(),
          title: q.title,
          type: q.type,
          answers: q.answers.map(a => ({
            id: generateId(),
            text: a.text,
            isCorrect: a.isCorrect,
          })),
          allowedTime: q.allowedTime,
          doublePoints: q.doublePoints,
          explanation: q.explanation,
        }));

        setQuiz({ questions: transformedQuestions });
        setProjectTitle(result.data.project.title);
        setHasChanges(false);
      } else {
        if (result.error) {
          toast.error(result.error);
        }

        await navigate({ to: '/dashboard/projects' });
      }

      setIsLoading(false);
    };

    loadQuizData();
  }, [projectId, navigate]);

  const handleSaveProject = useCallback(async () => {
    setIsSaving(true);
    const loadingToast = toast.loading('Saving your quiz...');

    try {
      const result = await saveQuiz({
        data: {
          projectId,
          quizState: {
            questions: quiz.questions.map(q => ({
              title: q.title,
              type: q.type,
              explanation: q.explanation,
              allowedTime: q.allowedTime,
              doublePoints: q.doublePoints,
              answers: q.answers,
            })),
          },
        },
      });

      if (result.success) {
        toast.success('Quiz saved successfully!', {
          id: loadingToast,
        });
        setHasChanges(false);
      } else {
        toast.error(result.error || 'Failed to save quiz', {
          id: loadingToast,
        });
      }
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : 'Failed to save quiz'}`,
        {
          id: loadingToast,
        },
      );
    } finally {
      setIsSaving(false);
    }
  }, [projectId, quiz]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const currentQuestion = quiz.questions[currentQuestionIndex] || null;

  const handleAddQuestion = useCallback(() => {
    const newQuestion: Question = {
      id: generateId(),
      title: 'Question',
      type: 'standard',
      answers: createInitialAnswers('standard'),
      allowedTime: 30,
      doublePoints: false,
      explanation: '',
    };
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
    setCurrentQuestionIndex(quiz.questions.length);
    setHasChanges(true);
  }, [quiz.questions.length]);

  const handleUpdateQuestion = useCallback((updatedQuestion: Question) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === updatedQuestion.id ? updatedQuestion : q,
      ),
    }));
    setHasChanges(true);
  }, []);

  const handleDeleteQuestion = useCallback(
    (questionId: string) => {
      setQuiz(prev => {
        const newQuestions = prev.questions.filter(q => q.id !== questionId);
        if (currentQuestionIndex >= newQuestions.length) {
          setCurrentQuestionIndex(Math.max(0, newQuestions.length - 1));
        }
        return { ...prev, questions: newQuestions };
      });
      setHasChanges(true);
    },
    [currentQuestionIndex],
  );

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, quiz.questions.length]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuiz(prev => {
        const oldIndex = prev.questions.findIndex(q => q.id === active.id);
        const newIndex = prev.questions.findIndex(q => q.id === over.id);
        const newQuestions = arrayMove(prev.questions, oldIndex, newIndex);

        const newCurrentIndex = newQuestions.findIndex(
          q =>
            q.id ===
            (currentQuestion?.id || prev.questions[currentQuestionIndex].id),
        );
        if (newCurrentIndex >= 0) {
          setCurrentQuestionIndex(newCurrentIndex);
        }

        return { ...prev, questions: newQuestions };
      });
      setHasChanges(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full overflow-hidden bg-neutral-950">
        <div className="flex w-72 flex-col overflow-hidden border-r border-neutral-800 bg-neutral-950">
          <div className="shrink-0 border-b border-neutral-800 p-3">
            <Skeleton className="h-8 w-full bg-neutral-800" />
          </div>

          <div className="shrink-0 border-b border-neutral-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 bg-neutral-800" />
              <Skeleton className="h-5 w-8 bg-neutral-800" />
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24 w-full bg-neutral-800" />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-6 py-3">
            <Skeleton className="h-8 w-24 bg-neutral-800" />
            <Skeleton className="h-8 flex-1 bg-neutral-800" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="h-6 w-6 bg-neutral-800" />
              <Skeleton className="h-6 w-16 bg-neutral-800" />
              <Skeleton className="h-6 w-6 bg-neutral-800" />
              <Skeleton className="h-8 w-8 bg-neutral-800" />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="grid flex-1 place-items-center overflow-hidden bg-[oklch(12%_0_0)] p-8 pb-20">
              <div className="aspect-video w-full max-w-4xl rounded-lg border border-neutral-800 bg-neutral-900 p-8">
                <div className="flex items-center gap-6">
                  <Skeleton className="h-8 w-32 bg-neutral-800" />
                  <Skeleton className="h-8 w-24 bg-neutral-800" />
                </div>
                <Skeleton className="mt-6 mb-8 h-12 w-3/4 bg-neutral-800" />
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-20 bg-neutral-800" />
                  ))}
                </div>
              </div>
            </div>

            <aside className="flex w-80 flex-col overflow-hidden bg-neutral-950">
              <div className="flex-1 space-y-4 overflow-y-auto border-l border-neutral-800 px-4 py-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-5 w-24 bg-neutral-800" />
                    <Skeleton className="h-20 w-full bg-neutral-800" />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] bg-neutral-950">
      <div className="flex w-72 flex-col overflow-hidden border-r border-neutral-800 bg-neutral-950">
        <div className="shrink-0 border-b border-neutral-800 p-3">
          <Button
            onClick={handleAddQuestion}
            size="sm"
            className="w-full gap-2"
            variant="outline"
          >
            <IconPlus size={16} /> Add Question
          </Button>
        </div>

        <div className="shrink-0 border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Questions</h2>
            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-semibold text-neutral-300">
              {quiz.questions.length}
            </span>
          </div>
        </div>

        <div className="h-full flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            id="dnd-context-id"
          >
            <SortableContext
              items={quiz.questions.map(q => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 p-3">
                {quiz.questions.map((question, index) => (
                  <QuestionThumbnail
                    key={question.id}
                    question={question}
                    index={index}
                    isActive={currentQuestionIndex === index}
                    onClick={() => setCurrentQuestionIndex(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {currentQuestion && (
          <NavigationPanel
            question={currentQuestion}
            currentIndex={currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            onTitleChange={title =>
              handleUpdateQuestion({ ...currentQuestion, title })
            }
            onPrevious={handlePreviousQuestion}
            onNext={handleNextQuestion}
            onDelete={handleDeleteQuestion}
            onSave={handleSaveProject}
            isSaving={isSaving}
            hasChanges={hasChanges}
          />
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="grid flex-1 place-items-center overflow-hidden bg-[oklch(12%_0_0)] p-8 pb-20">
            {currentQuestion ? (
              <QuestionDisplay question={currentQuestion} />
            ) : (
              <Card className="border-dashed border-neutral-800 bg-neutral-900 p-8 text-center">
                <p className="mb-4 text-neutral-400">
                  No questions yet. Add one to get started.
                </p>
                <Button onClick={handleAddQuestion} variant="default">
                  <IconPlus size={18} /> Create First Question
                </Button>
              </Card>
            )}
          </div>

          {currentQuestion && (
            <PropertiesPanel
              question={currentQuestion}
              onUpdate={handleUpdateQuestion}
            />
          )}
        </div>
      </div>
    </div>
  );
}
