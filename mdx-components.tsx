import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Mermaid } from '@/components/Mermaid';
import { ReactElement } from 'react';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...components,
    pre: (props: any) => {
      const { children, ...rest } = props;
      // Check if this is a mermaid code block
      const child = children as ReactElement<{ className?: string; children?: string }>;
      if (child?.props?.className === 'language-mermaid') {
        const code = child.props.children || '';
        return <Mermaid chart={code} />;
      }
      const Pre = defaultComponents.pre as any;
      return <Pre {...rest}>{children}</Pre>;
    },
  } as MDXComponents;
}
