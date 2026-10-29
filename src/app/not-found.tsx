import Link from "next/link";
import { BookX } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <EmptyState
        icon={<BookX className="h-6 w-6" />}
        title="That shelf is empty"
        description="The listing may have been sold, rented out or removed by the seller. Try the marketplace — there are hundreds of copies nearby."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/marketplace">
              <Button>Browse marketplace</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back home</Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
