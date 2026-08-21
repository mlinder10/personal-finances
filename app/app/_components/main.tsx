import { ReactNode } from "react";

type MainProps = {
  children?: ReactNode;
};

export default function Main({ children }: MainProps) {
  return <main className="flex flex-col h-full">{children}</main>;
}
