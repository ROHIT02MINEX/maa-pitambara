"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnswerOption, Difficulty, Occupation, QuestionType } from "@prisma/client";
import { MoreHorizontal, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  createQuestionAction,
  deleteQuestionAction,
  importQuestionsAction,
  toggleQuestionActiveAction,
  updateQuestionAction,
} from "@/actions/admin/questions";
import { runAction } from "@/lib/run-action";
import {
  DIFFICULTY_LABELS,
  OCCUPATIONS,
  OCCUPATION_LABELS,
  QUESTION_TYPE_LABELS,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminQuestionRow = {
  id: string;
  occupation: Occupation;
  topic: string;
  type: QuestionType;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: AnswerOption;
  explanation: string | null;
  difficulty: Difficulty;
  active: boolean;
};

type FormState = {
  occupation: Occupation;
  topic: string;
  type: QuestionType;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: AnswerOption;
  explanation: string;
  difficulty: Difficulty;
  active: boolean;
};

const EMPTY: FormState = {
  occupation: Occupation.FITTER,
  topic: "",
  type: QuestionType.MCQ,
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: AnswerOption.A,
  explanation: "",
  difficulty: Difficulty.EASY,
  active: true,
};

const CSV_TEMPLATE = `occupation,topic,type,question,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty
FITTER,Measurement,MCQ,"What is the least count of a standard vernier caliper?","0.01 mm","0.02 mm","0.1 mm","1 mm",B,"A standard vernier caliper reads to 0.02 mm.",EASY
ELECTRICIAN,Safety,TRUE_FALSE,"An earth connection protects against electric shock.",True,False,,,A,"Earthing gives fault current a safe path.",EASY`;

export function QuestionManager({ questions }: { questions: AdminQuestionRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<AdminQuestionRow | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [importErrors, setImportErrors] = React.useState<{ row: number; message: string }[]>([]);

  const isTrueFalse = form.type === QuestionType.TRUE_FALSE;

  function openCreate() {
    setForm(EMPTY);
    setEditingId(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(question: AdminQuestionRow) {
    setForm({
      occupation: question.occupation,
      topic: question.topic,
      type: question.type,
      question: question.question,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC ?? "",
      optionD: question.optionD ?? "",
      correctAnswer: question.correctAnswer,
      explanation: question.explanation ?? "",
      difficulty: question.difficulty,
      active: question.active,
    });
    setEditingId(question.id);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const payload = {
      ...form,
      optionA: isTrueFalse ? "True" : form.optionA,
      optionB: isTrueFalse ? "False" : form.optionB,
      optionC: isTrueFalse ? "" : form.optionC,
      optionD: isTrueFalse ? "" : form.optionD,
    };

    const result = await runAction(() =>
      editingId ? updateQuestionAction(editingId, payload) : createQuestionAction(payload),
    );
    setBusy(false);

    if (!result.ok) {
      const firstFieldError = Object.values(result.fieldErrors ?? {})[0]?.[0];
      setError(firstFieldError ?? result.error);
      return;
    }

    toast.success(result.message ?? "Saved.");
    setDialogOpen(false);
    router.refresh();
  }

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("csv") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      toast.error("Choose a CSV file first.");
      return;
    }

    setBusy(true);
    setImportErrors([]);
    try {
      const text = await file.text();
      const result = await runAction(() => importQuestionsAction(text));

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Imported.");
      setImportErrors(result.data?.errors ?? []);
      if ((result.data?.errors.length ?? 0) === 0) setImportOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(question: AdminQuestionRow) {
    const result = await runAction(() => toggleQuestionActiveAction(question.id, !question.active));
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Updated.");
      router.refresh();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await runAction(() => deleteQuestionAction(deleting.id));
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Deleted.");
    setDeleting(null);
    router.refresh();
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "questions-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const answerOptions = isTrueFalse
    ? [
        { value: AnswerOption.A, label: "A — True" },
        { value: AnswerOption.B, label: "B — False" },
      ]
    : [
        { value: AnswerOption.A, label: "A" },
        { value: AnswerOption.B, label: "B" },
        { value: AnswerOption.C, label: "C" },
        { value: AnswerOption.D, label: "D" },
      ];

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No questions match these filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Question</TableHead>
              <TableHead>Occupation</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Answer</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell className="max-w-[420px]">
                  <p className="line-clamp-2 font-medium">{question.question}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{OCCUPATION_LABELS[question.occupation]}</Badge>
                </TableCell>
                <TableCell className="text-sm">{question.topic}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {QUESTION_TYPE_LABELS[question.type]}
                </TableCell>
                <TableCell>
                  <Badge>{question.correctAnswer}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{DIFFICULTY_LABELS[question.difficulty]}</Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={question.active}
                    onCheckedChange={() => toggleActive(question)}
                    aria-label={question.active ? "Deactivate question" : "Activate question"}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Question actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEdit(question)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => setDeleting(question)}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create / edit ------------------------------------------------------ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !busy && setDialogOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit question" : "Add a question"}</DialogTitle>
            <DialogDescription>
              Questions are drawn at random from the bank for the matching occupation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="q-occupation">Occupation</Label>
                <Select
                  value={form.occupation}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, occupation: value as Occupation }))
                  }
                >
                  <SelectTrigger id="q-occupation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCUPATIONS.map((occupation) => (
                      <SelectItem key={occupation} value={occupation}>
                        {OCCUPATION_LABELS[occupation]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="q-type">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      type: value as QuestionType,
                      correctAnswer:
                        value === QuestionType.TRUE_FALSE &&
                        f.correctAnswer !== AnswerOption.A &&
                        f.correctAnswer !== AnswerOption.B
                          ? AnswerOption.A
                          : f.correctAnswer,
                    }))
                  }
                >
                  <SelectTrigger id="q-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuestionType.MCQ}>Multiple choice</SelectItem>
                    <SelectItem value={QuestionType.TRUE_FALSE}>True / False</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="q-difficulty">Difficulty</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, difficulty: value as Difficulty }))
                  }
                >
                  <SelectTrigger id="q-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-topic">Topic</Label>
              <Input
                id="q-topic"
                required
                value={form.topic}
                onChange={(event) => setForm((f) => ({ ...f, topic: event.target.value }))}
                placeholder="Measurement"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-question">Question</Label>
              <Textarea
                id="q-question"
                required
                value={form.question}
                onChange={(event) => setForm((f) => ({ ...f, question: event.target.value }))}
              />
            </div>

            {isTrueFalse ? (
              <Alert variant="info">
                <AlertDescription>
                  True/False questions use fixed options — choose whether the statement is true (A)
                  or false (B) below.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const key = `option${letter}` as "optionA" | "optionB" | "optionC" | "optionD";
                  return (
                    <div key={letter} className="space-y-2">
                      <Label htmlFor={`q-option-${letter}`}>Option {letter}</Label>
                      <Input
                        id={`q-option-${letter}`}
                        required
                        value={form[key]}
                        onChange={(event) =>
                          setForm((f) => ({ ...f, [key]: event.target.value }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="q-answer">Correct answer</Label>
                <Select
                  value={form.correctAnswer}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, correctAnswer: value as AnswerOption }))
                  }
                >
                  <SelectTrigger id="q-answer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {answerOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-3 pb-2">
                <Switch
                  id="q-active"
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, active: checked }))}
                />
                <Label htmlFor="q-active" className="cursor-pointer">
                  Active (included in new tests)
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-explanation">Explanation (optional)</Label>
              <Textarea
                id="q-explanation"
                value={form.explanation}
                onChange={(event) => setForm((f) => ({ ...f, explanation: event.target.value }))}
                placeholder="Shown to learners when they review their answers."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                {editingId ? "Save changes" : "Add question"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV import --------------------------------------------------------- */}
      <Dialog open={importOpen} onOpenChange={(open) => !busy && setImportOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk import questions</DialogTitle>
            <DialogDescription>
              Upload a CSV with the columns shown in the template. Rows that fail validation are
              reported and skipped; valid rows are still imported.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleImport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">CSV file</Label>
              <Input id="csv" name="csv" type="file" accept=".csv,text/csv" required />
            </div>

            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              Download template
            </Button>

            {importErrors.length > 0 ? (
              <Alert variant="warning">
                <AlertDescription>
                  <p className="mb-2 font-medium">{importErrors.length} row(s) were skipped:</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                    {importErrors.slice(0, 25).map((issue) => (
                      <li key={issue.row}>
                        Row {issue.row}: {issue.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                Close
              </Button>
              <Button type="submit" loading={busy}>
                <Upload className="h-4 w-4" /> Import
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the bank and from any past attempts that included it.
              Deactivating instead keeps historic results intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
