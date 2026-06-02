'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function BriefingPanel({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 text-lg font-semibold first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 mb-2 text-base font-semibold first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ children, href }) => (
            <a href={href} className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          hr: () => <hr className="my-4 border-black/10 dark:border-white/15" />,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-black/15 pl-3 text-black/70 dark:border-white/20 dark:text-white/70">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-black/5 px-1 py-0.5 text-[13px] dark:bg-white/10">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
