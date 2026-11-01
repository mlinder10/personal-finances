import { ReactNode } from "react";

export default function Body({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 md:pb-8">
      {children}
    </section>
  );
}
