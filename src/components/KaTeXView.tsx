import React, { useMemo } from 'react';
import katex from 'katex';

interface KaTeXViewProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const KaTeXView: React.FC<KaTeXViewProps> = ({ math, block = false, className = '' }) => {
  const html = useMemo(() => {
    if (!math) return '';
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch (err) {
      console.error('KaTeX error:', err);
      return math;
    }
  }, [math, block]);

  return (
    <span
      className={`${block ? 'block my-2 overflow-x-auto text-center' : 'inline-block'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
