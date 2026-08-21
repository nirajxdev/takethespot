import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BoardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>The Board</CardTitle>
          <CardDescription>
            The interactive territory canvas arrives in Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Board canvas placeholder
            </p>
          </div>
          <Button render={<Link href="/claim" />} variant="outline">
            Go to claim flow
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
