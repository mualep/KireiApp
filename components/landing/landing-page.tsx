/* eslint-disable @next/next/no-img-element -- CMS image hosts are not approved for Next remotePatterns yet. */
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  Gamepad2Icon,
  Grid2X2Icon,
  HeadphonesIcon,
  KeyboardIcon,
  LifeBuoyIcon,
  QuoteIcon,
  ShieldCheckIcon,
  StarIcon,
  TagIcon,
  UsersRoundIcon,
  ZapIcon,
} from "lucide-react";

import { SectionContainer } from "@/components/landing/section-container";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LandingData } from "@/lib/db/landing";

type LandingPageProps = {
  data: LandingData;
};

const numberFormatter = new Intl.NumberFormat("id-ID");
const featureIcons = [ShieldCheckIcon, ZapIcon, LifeBuoyIcon, TagIcon];

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function getHeroHeadlineParts(value: string) {
  const lineParts = value
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (lineParts.length > 1) {
    return {
      emphasis: lineParts.slice(1).join(" "),
      lead: lineParts[0],
    };
  }

  const commaIndex = value.indexOf(",");

  if (commaIndex > -1) {
    return {
      emphasis: value.slice(commaIndex + 1).trim(),
      lead: value.slice(0, commaIndex + 1).trim(),
    };
  }

  return {
    emphasis: "",
    lead: value,
  };
}

function ServiceVisual({
  index,
  service,
}: {
  index: number;
  service: LandingData["services"][number];
}) {
  const mediaUrl = service.imageUrl || service.iconUrl;

  return (
    <div className="relative min-h-56 overflow-hidden rounded-t-xl border-b border-border/70 bg-background">
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/60 to-background"
        aria-hidden="true"
      />
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={`${service.gameName} service visual`}
          width={640}
          height={420}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <>
          <div
            className="absolute top-8 left-8 size-24 rounded-full border border-border/60 bg-card/30"
            aria-hidden="true"
          />
          <div
            className="absolute right-8 bottom-10 size-32 rounded-full bg-primary/15 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 flex items-center justify-center text-muted-foreground/70"
            aria-hidden="true"
          >
            <Gamepad2Icon />
          </div>
        </>
      )}
      <div
        className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card to-transparent"
        aria-hidden="true"
      />
      <div className="relative flex min-h-56 flex-col justify-between p-6">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary">{service.serviceType}</Badge>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex justify-end">
          <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-lg backdrop-blur-sm">
            Boost Ready
          </span>
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ data }: LandingPageProps) {
  const services = [...data.services].sort(
    (first, second) =>
      first.sortOrder - second.sortOrder ||
      first.gameName.localeCompare(second.gameName),
  );
  const displayServices = services;
  const heroHeadline = getHeroHeadlineParts(data.hero.headline);
  const primaryCtaIsExternal = isExternalHref(data.hero.primaryCtaHref);
  const secondaryCtaIsExternal = isExternalHref(data.hero.secondaryCtaHref);
  const trustedStat = data.stats.find((stat) =>
    stat.label.toLowerCase().includes("buyer"),
  );
  const trustedCount = trustedStat
    ? `${numberFormatter.format(trustedStat.value)}${trustedStat.suffix}`
    : "850+";
  const featureCards = data.why.slice(0, 4);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:ring-3 focus:ring-ring/50"
      >
        Skip To Content
      </a>
      <SiteHeader
        orderHref={data.footer.g2gUrl}
        orderLabel={data.hero.primaryCtaLabel}
      />

      <div className="relative" id="main-content">
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute top-[-18rem] left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-[18rem] left-[-16rem] size-[34rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-[-14rem] bottom-[30rem] size-[36rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-[42rem] bg-gradient-to-b from-primary/10 via-background to-background" />
        </div>

        <section className="relative px-4 pt-36 pb-24 text-center sm:px-6 sm:pt-40 lg:px-8 lg:pt-48 lg:pb-32">
          <div
            className="absolute top-1/2 left-0 hidden -translate-y-1/2 lg:block"
            aria-hidden="true"
          >
            <div className="relative flex size-56 items-center justify-center overflow-hidden rounded-[2rem] border border-border/70 bg-card/35 opacity-60 shadow-2xl shadow-primary/10 backdrop-blur-sm">
              <div className="absolute inset-0 bg-primary/5" />
              <HeadphonesIcon
                className="relative text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
          </div>
          <div
            className="absolute top-1/2 right-0 hidden -translate-y-1/2 lg:block"
            aria-hidden="true"
          >
            <div className="relative flex size-56 items-center justify-center overflow-hidden rounded-[2rem] border border-border/70 bg-card/35 opacity-60 shadow-2xl shadow-primary/10 backdrop-blur-sm">
              <div className="absolute inset-0 bg-primary/5" />
              <KeyboardIcon
                className="relative text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="mx-auto flex max-w-4xl flex-col items-center gap-8">
            <Badge
              variant="outline"
              className="border-border/80 bg-card/70 px-2.5 py-1 shadow-lg shadow-primary/5 backdrop-blur-sm"
            >
              <span className="flex items-center -space-x-1" aria-hidden="true">
                <span className="flex size-5 items-center justify-center rounded-full border border-background bg-primary text-[0.6rem] text-primary-foreground">
                  K
                </span>
                <span className="size-5 rounded-full border border-background bg-secondary" />
                <span className="size-5 rounded-full border border-background bg-card" />
              </span>
              <span className="text-muted-foreground">
                Trusted by{" "}
                <strong className="font-semibold text-foreground">
                  {trustedCount}
                </strong>{" "}
                gamers
              </span>
            </Badge>

            <div className="flex flex-col gap-5">
              <h1 className="text-4xl leading-[0.98] font-extrabold tracking-tight text-balance sm:text-6xl lg:text-8xl">
                {heroHeadline.lead}
                {heroHeadline.emphasis ? (
                  <>
                    <br />
                    <span className="text-primary italic">
                      {heroHeadline.emphasis}
                    </span>
                  </>
                ) : null}
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground text-pretty sm:text-lg">
                {data.hero.subheadline}
              </p>
            </div>

            <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-8 shadow-xl shadow-primary/20"
              >
                <a
                  href={data.hero.primaryCtaHref}
                  target={primaryCtaIsExternal ? "_blank" : undefined}
                  rel={primaryCtaIsExternal ? "noreferrer" : undefined}
                >
                  {data.hero.primaryCtaLabel}
                  <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-border/80 bg-card/40 px-8 backdrop-blur-sm"
              >
                <a
                  href={data.hero.secondaryCtaHref}
                  target={secondaryCtaIsExternal ? "_blank" : undefined}
                  rel={secondaryCtaIsExternal ? "noreferrer" : undefined}
                >
                  {data.hero.secondaryCtaLabel}
                </a>
              </Button>
            </div>
          </div>
        </section>

        <SectionContainer id="services" className="py-24 lg:py-32">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
              {data.sections.services.title}
            </h2>
            <p className="text-base leading-7 text-muted-foreground text-pretty sm:text-lg">
              {data.sections.services.description}
            </p>
          </div>

          {displayServices.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayServices.map((service, index) => (
                <Card
                  key={service.id}
                  className="group bg-card/70 py-0 shadow-xl shadow-primary/5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <ServiceVisual index={index} service={service} />
                  <CardHeader className="gap-3 px-6 pt-6">
                    <CardTitle className="text-2xl font-bold tracking-tight">
                      {service.gameName}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 leading-6">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <a
                      href={data.hero.primaryCtaHref}
                      target={primaryCtaIsExternal ? "_blank" : undefined}
                      rel={primaryCtaIsExternal ? "noreferrer" : undefined}
                      className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      View More
                      <ArrowUpRightIcon aria-hidden="true" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Layanan segera tersedia.
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full px-8 shadow-xl shadow-primary/20"
            >
              <a
                href={data.hero.primaryCtaHref}
                target={primaryCtaIsExternal ? "_blank" : undefined}
                rel={primaryCtaIsExternal ? "noreferrer" : undefined}
              >
                Other Games
                <Grid2X2Icon data-icon="inline-end" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </SectionContainer>

        <section
          id="why-kireiku"
          aria-labelledby="why-kireiku-title"
          className="relative scroll-mt-24 border-y border-border/60 bg-card/25 px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/5 to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-16">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
              <h2
                id="why-kireiku-title"
                className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl"
              >
                {data.sections.why.title}
              </h2>
              <p className="text-base leading-7 text-muted-foreground text-pretty">
                {data.sections.why.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {data.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex min-w-0 flex-col items-center gap-2 text-center"
                >
                  <p className="font-mono text-4xl leading-none font-extrabold tracking-tighter text-foreground tabular-nums sm:text-5xl lg:text-6xl">
                    {numberFormatter.format(stat.value)}
                    <span className="text-primary">{stat.suffix}</span>
                  </p>
                  <p className="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featureCards.map((item, index) => {
                const FeatureIcon = featureIcons[index % featureIcons.length];

                return (
                  <Card
                    key={`${item.title}-${index}`}
                    className="bg-card/70 shadow-xl shadow-primary/5 transition-transform duration-300 hover:-translate-y-1"
                  >
                    <CardHeader className="gap-4">
                      <span className="flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
                        <FeatureIcon aria-hidden="true" />
                      </span>
                      <div className="flex flex-col gap-2">
                        <CardTitle className="break-words">
                          {item.title}
                        </CardTitle>
                        <CardDescription className="leading-6">
                          {item.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <SectionContainer
          id="testimonials"
          className="py-24 lg:py-32"
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
              {data.sections.testimonials.title}
            </h2>
            <p className="text-base leading-7 text-muted-foreground text-pretty">
              {data.sections.testimonials.description}
            </p>
          </div>

          {data.testimonials.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {data.testimonials.map((testimonial) => (
                <Card
                  key={testimonial.id}
                  className="relative bg-card/70 shadow-xl shadow-primary/5"
                >
                  <CardHeader className="gap-4">
                    <div
                      className="flex gap-1 text-primary"
                      aria-label={`${testimonial.rating} stars`}
                    >
                      {Array.from({ length: testimonial.rating }).map(
                        (_, index) => (
                          <StarIcon
                            key={index}
                            className="fill-current"
                            aria-hidden="true"
                          />
                        ),
                      )}
                    </div>
                    <CardDescription className="break-words text-pretty">
                      “{testimonial.comment}”
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-3">
                    <span
                      className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      aria-hidden="true"
                    >
                      <UsersRoundIcon />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{testimonial.buyerName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {testimonial.game}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mx-auto max-w-2xl bg-card/70 shadow-xl shadow-primary/5">
              <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                <span
                  className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary"
                  aria-hidden="true"
                >
                  <QuoteIcon />
                </span>
                <div className="flex flex-col gap-2">
                  <p className="font-semibold">Verified Reviews Coming Soon</p>
                  <p className="max-w-md text-sm leading-6 text-muted-foreground text-pretty">
                    Public testimonials stay hidden until they are verified, approved,
                    and ready to publish.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </SectionContainer>

        <SectionContainer
          id="how-it-works"
          className="py-20 lg:py-28"
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <p className="font-mono text-xs font-medium tracking-[0.28em] text-primary uppercase">
              {data.sections.howItWorks.eyebrow}
            </p>
            <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
              {data.sections.howItWorks.title}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground text-pretty">
              {data.sections.howItWorks.description}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {data.howItWorks.map((step, index) => (
              <Card key={step.title} className="bg-card/70 shadow-xl shadow-primary/5">
                <CardHeader className="gap-4">
                  <Badge variant="secondary" className="w-fit font-mono">
                    {String(index + 1).padStart(2, "0")}
                  </Badge>
                  <div className="flex flex-col gap-2">
                    <CardTitle>{step.title}</CardTitle>
                    <CardDescription className="leading-6">
                      {step.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          id="faq"
          className="relative py-24 lg:py-32"
        >
          <div
            className="pointer-events-none absolute right-0 bottom-0 size-80 rounded-full bg-primary/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-8">
            <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
              <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="text-sm leading-6 text-muted-foreground text-pretty">
                Everything you need to know about our services.
              </p>
            </div>

            <Card className="w-full bg-card/70 shadow-xl shadow-primary/5">
              <CardContent className="p-2 sm:p-3">
                <Accordion type="single" collapsible>
                  {data.faqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="rounded-lg px-3">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="px-3 text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </SectionContainer>

        <SiteFooter footer={data.footer} />
      </div>
    </main>
  );
}
