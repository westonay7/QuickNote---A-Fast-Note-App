import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/state/ToastContext";

const TOPICS = ["Bug report", "Feature request", "Question", "Something else"];

export function FeedbackPage() {
  const toast = useToast();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    // No feedback backend in the MVP: the message is handed to the user's mail
    // client so nothing is silently discarded or sent to a third party.
    const subject = encodeURIComponent(`[QuickNote] ${topic}`);
    const body = encodeURIComponent(
      `${message.trim()}${email.trim() ? `\n\nReply to: ${email.trim()}` : ""}`,
    );
    window.location.href = `mailto:feedback@quicknote.app?subject=${subject}&body=${body}`;
    setSending(false);
    setSent(true);
    toast.success("Opened your email app with the message prefilled.");
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Send feedback"
        description="Bug reports, feature requests, and questions all reach the same inbox."
      />

      {sent ? (
        <div className="card p-6 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <MessageSquare className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Your email app should have opened
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Your feedback was prefilled into a new message. If nothing opened, copy your message and
            send it to <span className="font-medium text-zinc-900 dark:text-zinc-100">feedback@quicknote.app</span>.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => setSent(false)}>
            Write another message
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="card space-y-4 p-5"
          aria-label="Feedback form"
        >
          <Field label="Topic" htmlFor="feedback-topic">
            <Select
              id="feedback-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Message" htmlFor="feedback-message" hint="What happened, and what did you expect?">
            <Textarea
              id="feedback-message"
              rows={7}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="I was trying to…"
            />
          </Field>
          <Field label="Reply-to email" htmlFor="feedback-email" hint="Optional — only needed if you want an answer.">
            <Input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={sending} disabled={!message.trim()}>
              Open in email app
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default FeedbackPage;
