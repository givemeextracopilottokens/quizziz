import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '~/lib/utils';

function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: Omit<SeparatorPrimitive.Props, 'orientation'> & {
  orientation: SeparatorPrimitive.Props['orientation'] | 'skew';
}) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation === 'skew' ? 'vertical' : 'horizontal'}
      className={cn(
        'shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch',
        orientation === 'skew' ? 'scale-y-35 rotate-30' : '',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
