import React from 'react';

const parseMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  return markdown
    .split('\n\n') // Split into paragraphs
    .map(paragraph => {
      // Process block elements first
      if (paragraph.startsWith('# ')) return `<h1>${paragraph.substring(2)}</h1>`;
      if (paragraph.startsWith('## ')) return `<h2>${paragraph.substring(3)}</h2>`;
      if (paragraph.startsWith('### ')) return `<h3>${paragraph.substring(4)}</h3>`;

      // Handle lists
      if (paragraph.match(/^\s*[-*] /m)) {
        const items = paragraph.split('\n').map(item => `<li>${item.replace(/^\s*[-*] /, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      
      // Process inline elements within what's left (paragraphs)
      if (paragraph.trim()) {
          const inlineProcessed = paragraph
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/__(.*?)__/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/_(.*?)_/g, '<em>$1</em>')
              .replace(/\n/g, '<br/>'); // Preserve line breaks within a paragraph
          return `<p>${inlineProcessed}</p>`;
      }
      
      return '';
    })
    .join('');
};

export const MarkdownRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
  const html = parseMarkdown(markdown);

  return (
    <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
      <style>{`
        .prose h1 { font-size: 1.25em; margin-top: 0.8em; margin-bottom: 0.4em; color: #93c5fd; font-family: 'Orbitron', sans-serif; }
        .prose h2 { font-size: 1.1em; margin-top: 0.8em; margin-bottom: 0.4em; color: #a5b4fc; font-family: 'Orbitron', sans-serif; }
        .prose h3 { font-size: 1.0em; margin-top: 0.8em; margin-bottom: 0.4em; color: #c7d2fe; font-family: 'Orbitron', sans-serif; }
        .prose p { margin-bottom: 0.75em; }
        .prose strong { color: #f9fafb; font-weight: 700; }
        .prose em { color: #d1d5db; }
        .prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 0.75em; }
        .prose li { margin-bottom: 0.25em; }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
