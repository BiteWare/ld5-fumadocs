'use client';

import { useEffect, useRef, useState } from 'react';

export function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current) return;
      
      // Dynamically import mermaid to avoid SSR issues
      const mermaid = (await import('mermaid')).default;
      
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
      });

      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      try {
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setSvg(`<pre style="color: red;">Error rendering diagram</pre>`);
      } finally {
        setIsLoading(false);
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div 
      ref={containerRef} 
      className="my-4 flex justify-center overflow-x-auto"
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm py-8">Loading diagram...</div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </div>
  );
}
