"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const promptSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(280).optional(),
  content: z.string().min(10, "Prompt content should be at least 10 characters"),
  notes: z.string().max(320),
  model: z.string().min(2),
  temperature: z.coerce.number().min(0).max(2)
});

export type PromptFormValues = z.infer<typeof promptSchema>;

type PromptEditorProps = {
  mode: "create-prompt" | "new-version";
  title: string;
  helper: string;
  submitLabel: string;
  initialValues?: Partial<PromptFormValues>;
  onSubmit: (values: PromptFormValues) => Promise<void>;
};

export function PromptEditor({
  mode,
  title,
  helper,
  submitLabel,
  initialValues,
  onSubmit
}: PromptEditorProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      content: initialValues?.content ?? "",
      notes: initialValues?.notes ?? "",
      model: initialValues?.model ?? "gpt-4.1",
      temperature: initialValues?.temperature ?? 0.2
    }
  });

  async function handleSubmit(values: PromptFormValues) {
    setSubmitError(null);

    if (mode === "create-prompt" && (!values.name || !values.description)) {
      setSubmitError("Prompt name and description are required.");
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(values);
      if (mode === "create-prompt") {
        form.reset({
          name: "",
          description: "",
          content: "",
          notes: "",
          model: "gpt-4.1",
          temperature: 0.2
        });
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save prompt");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{helper}</p>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-5 space-y-4">
        {mode === "create-prompt" ? (
          <>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-300">Prompt name</span>
              <input
                {...form.register("name")}
                placeholder="Customer support deflection"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none transition focus:border-[#2f81f7]"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-slate-300">Description</span>
              <input
                {...form.register("description")}
                placeholder="Routes billing questions to self-serve answers"
                className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none transition focus:border-[#2f81f7]"
              />
            </label>
          </>
        ) : null}

        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Prompt content</span>
          <textarea
            {...form.register("content")}
            rows={10}
            placeholder="You are a support assistant that..."
            className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 font-mono text-xs text-slate-100 outline-none transition focus:border-[#2f81f7] sm:text-sm"
          />
          <span className="text-xs text-slate-500">
            Focus each revision on one hypothesis so A/B outcomes stay interpretable.
          </span>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-slate-300">Version notes</span>
          <textarea
            {...form.register("notes")}
            rows={3}
            placeholder="Changed refusal style and answer formatting for compliance"
            className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none transition focus:border-[#2f81f7]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-slate-300">Model</span>
            <input
              {...form.register("model")}
              placeholder="gpt-4.1"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none transition focus:border-[#2f81f7]"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-slate-300">Temperature</span>
            <input
              {...form.register("temperature")}
              type="number"
              step="0.1"
              min="0"
              max="2"
              className="w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-slate-100 outline-none transition focus:border-[#2f81f7]"
            />
          </label>
        </div>

        {form.formState.errors.content ? (
          <p className="text-xs text-red-300">{form.formState.errors.content.message}</p>
        ) : null}
        {submitError ? <p className="text-xs text-red-300">{submitError}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md bg-[#2f81f7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f6feb] disabled:opacity-60"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </form>
    </div>
  );
}
