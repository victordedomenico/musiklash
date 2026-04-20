import type { Metadata } from "next";
import CreateBracketForm from "./CreateBracketForm";

export const metadata: Metadata = {
  title: "Créer un bracket — MusiKlash",
};

export default async function CreateBracketPage() {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-1 py-5 sm:px-2 lg:py-8">
      <h1 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl lg:text-6xl">
        Créer un nouveau défi
      </h1>
      <p className="mt-2 text-base sm:text-xl lg:text-2xl" style={{ color: "#8f93a0" }}>
        Transformez votre sélection musicale en expérience interactive.
      </p>

      <div className="mt-6 sm:mt-8 lg:mt-9">
        <CreateBracketForm />
      </div>
    </div>
  );
}
