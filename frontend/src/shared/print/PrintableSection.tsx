import type { HTMLAttributes, ReactNode } from 'react';

type PrintableSectionProps = HTMLAttributes<HTMLElement> & {
  id: string;
  children: ReactNode;
  as?: 'section' | 'div' | 'article';
  printRoot?: string;
};

export function PrintableSection({
  id,
  children,
  as: Tag = 'section',
  printRoot,
  className = '',
  ...rest
}: PrintableSectionProps) {
  return (
    <Tag
      id={id}
      data-print-root={printRoot || id}
      className={`printable-section ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
