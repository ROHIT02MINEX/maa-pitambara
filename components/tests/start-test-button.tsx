"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { toast } from "@/lib/toast";

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
        <PlayCircle className="h-4 w-4" /><T>{" Resume your test "}</T></Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className={className} size="lg" disabled={disabled}>
          <PlayCircle className="h-4 w-4" /><T>{" Start a test "}</T></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle><T>{"Ready to begin?"}</T></AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p><T>{"Once you start, the 30-minute timer runs on the server. To be clear:"}</T></p>
              <ul className="list-disc space-y-1 pl-5">
                <li><T>{TEST_QUESTION_COUNT}</T><T>{" randomly selected questions, one mark each."}</T></li>
                <li><T>{"No negative marking, so answer everything."}</T></li>
                <li><T>{"Refreshing or closing the tab does not reset the clock."}</T></li>
                <li><T>{"When time runs out your answers are submitted automatically."}</T></li>
                <li><T>{"You need "}</T><T>{PASS_PERCENTAGE}</T><T>{"% to pass, and answers are final once submitted."}</T></li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel><T>{"Not yet"}</T></AlertDialogCancel>
          <AlertDialogAction onClick={start}><T>{"Start the test"}</T></AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
