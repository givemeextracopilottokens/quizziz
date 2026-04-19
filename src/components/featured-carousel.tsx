import { useEffect, useState, type ComponentProps } from 'react';
import {
  IconBook,
  IconBriefcase2,
  IconChevronRight,
  IconCodeDots,
  IconSquareRoot2,
} from '@tabler/icons-react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '~/components/ui/carousel';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

const featuredCards = [
  {
    title: 'Featured course',
    description:
      'Sharpen Your Designing Skills with Professional Online Courses',
    action: 'Start learning',
    cardClassName: 'from-indigo-600 to-purple-600',
    buttonClassName: 'text-purple-700',
    icon: IconBook,
  },
  {
    title: 'Featured quizz',
    description:
      'Test Your Coding Skills with Interactive Programming Challenges',
    action: 'Try it now',
    cardClassName: 'from-[#eca94b] to-[#de320b]',
    buttonClassName: 'text-orange-700',
    icon: IconCodeDots,
  },
  {
    title: 'Featured quizz',
    description: 'Strengthen Your Problem-Solving with Engaging Math Quizzes',
    action: 'Get started',
    cardClassName: 'from-green-600 to-emerald-600',
    buttonClassName: 'text-emerald-700',
    icon: IconSquareRoot2,
  },
  {
    title: 'Featured course',
    description: 'Master Job Interviews with Expert-Led Preparation Courses',
    action: 'Start learning',
    cardClassName: 'from-cyan-600 to-blue-600',
    buttonClassName: 'text-blue-700',
    icon: IconBriefcase2,
  },
];

export function FeaturedCarousel({
  className,
  ...props
}: ComponentProps<'div'>) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  useEffect(() => {
    carouselApi?.on('scroll', api => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    });
  }, [carouselApi]);

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl', className)}
      {...props}
    >
      <div
        className={`${!carouselApi || !canScrollPrev ? 'opacity-0' : ''} pointer-events-none absolute inset-y-0 left-0 z-1 w-16 bg-linear-to-r from-background/60 to-transparent transition-opacity duration-500`}
      />
      <div
        className={`${!carouselApi || !canScrollNext ? 'opacity-0' : ''} pointer-events-none absolute inset-y-0 right-0 z-1 w-16 bg-linear-to-l from-background/60 to-transparent transition-opacity duration-500`}
      />

      <Carousel
        setApi={setCarouselApi}
        opts={{ align: 'end' }}
        className="w-full"
      >
        <CarouselNext
          variant="secondary"
          className={`${!carouselApi ? 'opacity-0' : ''} right-4 z-1 -translate-y-1/2! transition duration-300 disabled:opacity-0`}
        />
        <CarouselPrevious
          variant="secondary"
          className={`${!carouselApi ? 'opacity-0' : ''} left-4 z-1 -translate-y-1/2! transition duration-300 disabled:opacity-0`}
        />

        <CarouselContent>
          {featuredCards.map((card, index) => (
            <CarouselItem key={index} className="basis-[35%] pl-6">
              <Card
                className={cn(
                  'relative animate-in bg-linear-to-b duration-700 ease-out fill-mode-both select-none zoom-in-95 fade-in',
                  card.cardClassName,
                )}
                style={{ animationDelay: `${(index + 1) * 200}ms` }}
              >
                <card.icon className="absolute right-4 size-40 rotate-5 opacity-20" />
                <CardHeader>
                  <CardTitle className="text-xs tracking-wider text-white/90 uppercase">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-[1.375rem] font-semibold text-white">
                  {card.description}
                </CardContent>
                <CardFooter>
                  <Button
                    className={cn(
                      'bg-white! px-4 tracking-wide shadow-sm hover:cursor-pointer',
                      card.buttonClassName,
                    )}
                  >
                    {card.action}
                    <IconChevronRight className="ml-1 size-4" />
                  </Button>
                </CardFooter>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
