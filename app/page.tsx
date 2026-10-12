import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0E0A1F] p-8 text-center text-[#F4EEFF]">
      <h1 className="text-5xl font-black">Chog State</h1>
      <p className="max-w-md text-lg text-[#B9AEE0]">
        Chog was born from a failed experiment. Now we give him a life that can be scarred.
      </p>
      <Link href="/lab" className="rounded-2xl border-4 border-[#0E0A1F] bg-[#FF3D81] px-8 py-4 text-xl font-black uppercase text-white shadow-[0_6px_0_#7a1b43]">
        Meet a Chog
      </Link>
      <p className="text-xs text-[#9B90C4]">Demo mode. No wallet needed.</p>
    </main>
  );
}
