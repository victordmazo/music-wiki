import { Header } from './Header';
import { Sidebar } from './Sidebar';

/**
 * The page chrome every route shares: header, left nav, a white content card, and
 * a footer. Mounted once in app/layout.tsx — individual pages only render what
 * goes inside the card.
 */
export function WikiShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-wikibg">
      <Header />
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-hidden rounded border border-wikiborder-light bg-white p-6 shadow-sm">
          {children}
        </main>
      </div>
      <footer className="border-t border-wikiborder-light py-6 text-center text-xs text-wikisubtle">
        NE Scene-pedia — a capstone project wiki for the New England local music scene.
      </footer>
    </div>
  );
}
