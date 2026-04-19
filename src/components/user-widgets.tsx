import { useEffect, type ComponentProps } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { Label, Pie, PieChart } from 'recharts';
import { IconTrendingUp } from '@tabler/icons-react';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '~/components/ui/chart';
import { Button } from '~/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '~/components/ui/item';
import { useIsMounted } from '~/hooks/use-mounted';
import { cn } from '~/lib/utils';

const chartQuizData = [
  { key: 'quiz1', views: 75, fill: 'var(--color-quiz1)' },
  { key: 'quiz2', views: 52, fill: 'var(--color-quiz2)' },
  { key: 'quiz3', views: 36, fill: 'var(--color-quiz3)' },
  { key: 'quiz4', views: 18, fill: 'var(--color-quiz4)' },
  { key: 'other', views: 24, fill: 'var(--color-other)' },
];

const chartQuizConfig = {
  views: {
    label: 'Views',
  },
  quiz1: {
    label: 'JavaScript Fundamentals Challenge',
    color: 'var(--color-rose-400)',
  },
  quiz2: {
    label: 'Ultimate General Knowledge Quiz',
    color: 'var(--color-amber-400)',
  },
  quiz3: {
    label: 'Math Mastery: Algebra & Logic Test',
    color: 'var(--color-emerald-400)',
  },
  quiz4: {
    label: 'Frontend Development Essentials Quiz',
    color: 'var(--color-indigo-400)',
  },
  other: {
    label: 'Other',
    color: 'var(--color-neutral-600)',
  },
} satisfies ChartConfig;

const lastPlayedData = [
  {
    title: 'JavaScript Fundamentals Challenge',
    description: '20.03.2026 - Finished #2',
    className: 'bg-rose-500/20 border-rose-500',
  },
  {
    title: 'Ultimate General Knowledge Quiz',
    description: '13.03.2026 - Finished #1',
    className: 'bg-amber-500/20 border-amber-500',
  },
  {
    title: 'Math Mastery: Algebra & Logic Test',
    description: '25.02.2026 - Finished #4',
    className: 'bg-emerald-500/20 border-emerald-500',
  },
  {
    title: 'Frontend Development Essentials Quiz',
    description: '20.02.2026 - Finished #3',
    className: 'bg-indigo-500/20 border-indigo-500',
  },
];

export function UserWidgets({ className, ...props }: ComponentProps<'div'>) {
  const isMounted = useIsMounted();

  const viewsCount = useMotionValue(0);
  const viewsCountRounded = useTransform(viewsCount, v => Math.floor(v));

  useEffect(() => {
    const totalViews = chartQuizData.reduce((acc, cur) => acc + cur.views, 0);
    const controls = animate(viewsCount, totalViews, {
      duration: 1.5,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, []);

  return (
    <div
      className={cn(
        'grid h-full w-100 shrink-0 rounded-xl bg-secondary/50 p-6',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <h4 className="animate-in text-xl font-medium delay-200 duration-500 fill-mode-both slide-in-from-top-10 fade-in">
          Most viewed quizzes
        </h4>

        <ChartContainer
          config={chartQuizConfig}
          className={`${!isMounted ? 'opacity-0' : ''} mx-auto aspect-square h-62.5 transition-opacity`}
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartQuizData}
              nameKey="key"
              dataKey="views"
              innerRadius={76}
              outerRadius={104}
              cornerRadius={5}
              paddingAngle={5}
              animationBegin={0}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <motion.tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {viewsCountRounded}
                        </motion.tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Views
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="flex animate-in flex-col items-center gap-2 text-base delay-200 duration-500 fill-mode-both slide-in-from-bottom-10 fade-in">
          <div className="flex items-center gap-1 leading-none font-medium">
            Trending up by{' '}
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <IconTrendingUp className="h-4 w-4" /> 5.2%
            </span>{' '}
            this month
          </div>
          <div className="leading-none text-muted-foreground">
            Showing total views for the last 6 months
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <h4 className="animate-in text-xl font-medium delay-200 duration-500 fill-mode-both slide-in-from-top-10 fade-in">
          Last played quizzes
        </h4>

        <div className="grid gap-4">
          {lastPlayedData.map((item, index) => (
            <Item
              variant="outline"
              className={cn(
                'animate-in duration-700 ease-out fill-mode-both zoom-in-95 fade-in',
                item.className,
              )}
              style={{ animationDelay: `${(index + 1) * 200}ms` }}
              key={index}
            >
              <ItemContent>
                <ItemTitle>{item.title}</ItemTitle>
                <ItemDescription>{item.description}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="outline">Play</Button>
              </ItemActions>
            </Item>
          ))}
        </div>
      </div>
    </div>
  );
}
