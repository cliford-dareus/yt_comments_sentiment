import Background from "@/components/background";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

const FEATURES = [
  {
    title: "Per-comment sentiment",
    body: "Label every comment positive, negative, or neutral — with confidence scores and a creator-ready brief.",
  },
  {
    title: "Themes & triage inbox",
    body: "Cluster criticism, questions, and praise so you know what to fix, answer, or celebrate first.",
  },
  {
    title: "Reply assistant",
    body: "Draft on-brand replies in seconds. Save drafts, mark triage done, keep the conversation moving.",
  },
  {
    title: "Channel health scans",
    body: "Sample recent uploads, compare comment climate, and spot cooling trends before they compound.",
  },
  {
    title: "Chat with your comments",
    body: "Ask natural questions over your comment section — grounded in real comments, not invented ones.",
  },
  {
    title: "Quota-aware YouTube fetch",
    body: "Background jobs with progress tracking and soft daily quota limits so analysis stays reliable.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Paste a video",
    body: "Drop a YouTube URL or ID. We fetch top-level comments within your quota budget.",
  },
  {
    step: "2",
    title: "Let analysis run",
    body: "A durable background job labels sentiment, builds themes, and indexes context for chat.",
  },
  {
    step: "3",
    title: "Act on insights",
    body: "Read the brief, work the triage inbox, draft replies, or ask the assistant what people care about.",
  },
] as const;

export default function Home() {
  return (
    <Background>
      {/* Hero */}
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col items-center justify-center px-4 pb-20 pt-24 text-center sm:px-6">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-indigo-300/90">
          For YouTube creators
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
          {BRAND.tagline}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          {BRAND.description}
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-12 min-w-[180px] rounded-full bg-white px-8 text-base font-medium text-slate-900 hover:bg-slate-100"
          >
            <Link href="/auth">Get started free</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 min-w-[180px] rounded-full border-slate-500 bg-transparent px-8 text-base text-slate-100 hover:bg-white/10 hover:text-white"
          >
            <a href="#features">See features</a>
          </Button>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Sign in with Google · not affiliated with YouTube
        </p>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
      >
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Built for the comment section, not vanity metrics
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Go beyond likes. Understand tone, recurring issues, and what to
            reply to — per video or across a channel.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.07]"
            >
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
      >
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Three steps from URL to actionable audience insight.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="relative rounded-2xl border border-white/10 bg-slate-950/40 p-6"
            >
              <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-300">
                {s.step}
              </span>
              <h3 className="text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/60 to-slate-950/80 px-6 py-14 text-center backdrop-blur-sm sm:px-12">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Stop guessing what the comments mean
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-slate-300">
            Sign in, paste a video, and get sentiment, themes, and reply drafts
            in one place.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 rounded-full bg-white px-8 text-base font-medium text-slate-900 hover:bg-slate-100"
          >
            <Link href="/auth">Open {BRAND.name}</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center text-sm text-slate-500 sm:flex-row sm:text-left">
          <span className="font-medium text-slate-400">{BRAND.name}</span>
          <p>{BRAND.shortDescription}</p>
          <p>Not affiliated with YouTube or Google</p>
        </div>
      </footer>
    </Background>
  );
}
