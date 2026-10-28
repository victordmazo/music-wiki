import './globals.css';
import { CurrentProfileProvider } from '../lib/current-profile-context';
import { WikiShell } from '../components/wiki/WikiShell';

export const metadata = {
  title: 'NE Scene-pedia',
  description: 'A collaborative wiki for the New England local music scene',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CurrentProfileProvider>
          <WikiShell>{children}</WikiShell>
        </CurrentProfileProvider>
      </body>
    </html>
  );
}
