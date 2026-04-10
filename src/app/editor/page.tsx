import { Suspense } from 'react';
import EditorPageClient from '@/components/editor/EditorPageClient';

function EditorFallback() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFBFC',
        color: '#94A3B8',
        fontSize: '14px',
        fontFamily: '"Segoe UI", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      Loading...
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <EditorPageClient />
    </Suspense>
  );
}
