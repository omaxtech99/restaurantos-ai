import * as React from 'react';
import { cn } from '../lib/utils';

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'outline' }) {
  const variant = props.variant ?? 'default';
  const { variant: _variant, ...rest } = props;
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        variant === 'default' && 'border-transparent bg-primary text-primary-foreground',
        variant === 'secondary' && 'border-transparent bg-secondary text-secondary-foreground',
        variant === 'outline' && 'text-foreground',
        className,
      )}
      {...rest}
    />
  );
}
