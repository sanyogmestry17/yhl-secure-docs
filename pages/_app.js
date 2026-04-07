import "@/styles/globals.css";
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const scrollToTop = () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    router.events.on('routeChangeComplete', scrollToTop);
    return () => router.events.off('routeChangeComplete', scrollToTop);
  }, [router]);

  return (
    <>
      <Component {...pageProps} />
      <SpeedInsights />
    </>
  );
}
