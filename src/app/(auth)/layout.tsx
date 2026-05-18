import { AnimatedBackground } from '@/components/backgrounds';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnimatedBackground />
      {children}
    </>
  );
}
