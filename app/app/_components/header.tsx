import { ReactNode } from "react";

type HeaderProps = {
  title: string;
  children?: ReactNode;
};

export default function Header({ title, children }: HeaderProps) {
  return (
    <header className="flex justify-between bg-sidebar px-8 pt-8 pb-4 border-b">
      <h1 className="font-bold text-2xl">{title}</h1>
      {children ? children : null}
    </header>
  );
}
