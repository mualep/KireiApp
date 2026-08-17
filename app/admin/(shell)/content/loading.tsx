import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ContentLoading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {/* Banner Section */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card/75 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-32 rounded-full bg-muted/80" />
              <Skeleton className="h-6 w-24 rounded-full bg-muted/60" />
            </div>
            <Skeleton className="mt-2 h-10 w-64 rounded-lg bg-muted/90" />
            <Skeleton className="h-4 w-full max-w-xl rounded bg-muted/50" />
          </div>
          <div className="rounded-3xl border border-border bg-background/50 p-4">
            <Skeleton className="h-4 w-36 rounded bg-muted/80" />
            <Skeleton className="mt-2 h-3 w-48 rounded bg-muted/50" />
          </div>
        </div>
      </section>

      {/* Content Summary Cards Grid */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/80 bg-card/75 shadow-xl backdrop-blur-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="font-semibold uppercase tracking-widest">
                  <Skeleton className="h-3 w-24 rounded bg-muted/70" />
                </CardDescription>
                <Skeleton className="size-8 rounded-full bg-muted/80" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-16 rounded-lg bg-muted/90" />
              <Skeleton className="mt-2 h-3.5 w-28 rounded bg-muted/50" />
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Hero & Stats Section */}
      <section className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28 rounded bg-muted/70" />
          <Skeleton className="h-7 w-48 rounded-lg bg-muted/90" />
          <Skeleton className="h-4 w-96 rounded bg-muted/50" />
        </div>
        <Separator className="my-5" />
        <div className="grid gap-6 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border-border/80 bg-background/45 w-full">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-6 w-32 rounded-lg bg-muted/90" />
                  <Skeleton className="h-5 w-16 rounded-full bg-muted/60" />
                </div>
                <Skeleton className="h-3.5 w-40 rounded bg-muted/50 mt-1" />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="rounded-2xl border border-border bg-card/70 p-4 flex flex-col gap-3">
                  <Skeleton className="h-4 w-36 rounded bg-muted/80" />
                  <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section className="rounded-[2rem] border border-border bg-card/75 p-5 shadow-xl backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20 rounded bg-muted/70" />
          <Skeleton className="h-7 w-40 rounded-lg bg-muted/90" />
          <Skeleton className="h-4 w-80 rounded bg-muted/50" />
        </div>
        <Separator className="my-5" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/80 bg-background/45">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full bg-muted/60" />
                  <Skeleton className="h-5 w-24 rounded bg-muted/60" />
                </div>
                <Skeleton className="h-6 w-48 rounded-lg bg-muted/90 mt-2" />
                <Skeleton className="h-4 w-full rounded bg-muted/50" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-28 rounded-lg bg-muted/80" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
