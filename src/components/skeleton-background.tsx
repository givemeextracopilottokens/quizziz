import { useState, useEffect, type ComponentProps } from 'react';
import { motion } from 'motion/react';

import { cn } from '~/lib/utils';

const tailwindColors = [
  '#ff6467',
  '#ff8903',
  '#ffb900',
  '#fdc700',
  '#9ae600',
  '#06df72',
  '#00d492',
  '#00d5bd',
  '#00d3f2',
  '#00bcff',
  '#51a2ff',
  '#7c86ff',
  '#a684ff',
  '#c27aff',
  '#ed6bff',
  '#fb64b6',
  '#ff637e',
];

const GRID_SLOTS = [
  { className: 'col-span-2 row-span-1' },
  { className: 'col-span-1 row-span-1' },
  { className: 'col-span-2 row-span-2' },
  { className: 'col-span-1 row-span-4' },
  { className: 'col-span-2 row-span-4' },
  { className: 'col-span-1 row-span-1' },
  { className: 'col-span-1 row-span-1' },
  { className: 'col-span-1 row-span-1' },
  { className: 'col-span-1 row-span-2' },
  { className: 'col-span-1 row-span-1' },
];

export function SkeletonBackground({
  className,
  ...props
}: ComponentProps<typeof motion.div>) {
  const [items, setItems] = useState(() =>
    GRID_SLOTS.map((_, i) => ({ id: `skel-${i}` })),
  );
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const colorInterval = setInterval(() => {
      setPhase(p => (p + 1) % tailwindColors.length);
    }, 1000);
    return () => clearInterval(colorInterval);
  }, []);

  useEffect(() => {
    function swap() {
      setItems(prev => {
        const newItems = [...prev];

        const swapCount = Math.random() > 0.5 ? 3 : 4;
        const startIdx = Math.floor(
          Math.random() * (newItems.length - swapCount),
        );

        const subset = newItems.slice(startIdx, startIdx + swapCount);
        subset.push(subset.shift()!);

        newItems.splice(startIdx, swapCount, ...subset);
        return newItems;
      });
    }

    const swapInterval = setInterval(() => {
      swap();

      if (Math.random() > 0.5) {
        setTimeout(swap, 1000);
      }

      if (Math.random() > 0.5) {
        setTimeout(swap, 2000);
      }
    }, 7000);

    return () => clearInterval(swapInterval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5 }}
      transition={{ duration: 2, ease: 'easeIn' }}
      className={cn(
        'absolute inset-6 grid grid-cols-5 grid-rows-5 gap-4',
        className,
      )}
      {...props}
    >
      {items.map((item, index) => {
        const colorIndex = (phase + index) % tailwindColors.length;
        const targetColor = tailwindColors[colorIndex];

        return (
          <motion.div
            key={item.id}
            layout
            animate={{ backgroundColor: targetColor }}
            transition={{
              layout: { type: 'spring', stiffness: 180, damping: 18 },
              backgroundColor: { duration: 1, ease: 'linear' },
            }}
            className={cn(
              'relative overflow-hidden rounded-xl border border-white/5 shadow-2xl',
              GRID_SLOTS[index].className,
            )}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%)',
                backgroundSize: '200% 200%',
              }}
              animate={{ backgroundPosition: ['0% 0%', '200% 200%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
