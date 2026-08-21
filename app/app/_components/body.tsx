import { ReactNode } from "react";

type BodyProps = {
  children: ReactNode;
};

export default function Body({ children }: BodyProps) {
  return <section className="flex-1 p-4 overflow-y-auto">{children}</section>;
}
