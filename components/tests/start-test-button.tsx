"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { startTestAction } from "@/actions/test";
import { runAction } from "@/lib/run-action";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PASS_PERCENTAGE, TEST_QUESTION_COUNT } from "@/lib/constants";

export function StartTestButton({
  disabled,
  resumeId,
  className,
}: {
  disabled?: boolean;
  resumeId?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function start() {
    setLoading(true);
    const result = await runAction(() => startTestAction());
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.push(`/tests/${result.data!.testId}`);
  }

  if (resumeId) {
    return (
      <Button
        className={className}
        size="lg"
        loading={loading}
        onClick={() => router.push(`/tests/${resumeId}`)}
      >
        <PlayCircle className="h-4 w-4" /> Resume your test
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className={className} size="lg" disabled={disabled}>
          <PlayCircle className="h-4 w-4" /> Start a test
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ready to begin?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>Once you start, the 30-minute timer runs on the server. To be clear:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{TEST_QUESTION_COUNT} randomly selected questions, one mark each.</li>
                <li>No negative marking, so answer everything.</li>
                <li>Refreshing or closing the tab does not reset the clock.</li>
                <li>When time runs out your answers are submitted automatically.</li>
                <li>You need {PASS_PERCENTAGE}% to pass, and answers are final once submitted.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={start}>Start the test</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
