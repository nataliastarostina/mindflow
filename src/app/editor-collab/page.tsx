import { Suspense } from 'react';
import CollabEditorClient from '@/components/editor/CollabEditorClient';

function Fallback() {
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
        fontSize: 14,
        fontFamily:
          '"Segoe UI", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      Loading collab…
    </div>
  );
}

export default function EditorCollabPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <CollabEditorClient />
    </Suspense>
  );
}
