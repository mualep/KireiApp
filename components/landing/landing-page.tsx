import { ArrowUpRightIcon, SparklesIcon, StarIcon } from "lucide-react";

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

export function LandingPage({ data }: LandingPageProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:ring-3 focus:ring-ring/50"
      >
        Skip To Content
      </a>
      <SiteHeader />

      <div className="relative" id="main-content">
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
          <div className="absolute top-[-12rem] left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute top-[22rem] right-[-12rem] size-[30rem] rounded-full bg-secondary/40 blur-3xl" />
          <div className="absolute bottom-[18rem] left-[-12rem] size-[28rem] rounded-full bg-accent/15 blur-3xl" />
        </div>

        <section className="relative px-4 pt-20 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col gap-7">
              <Badge variant="secondary" className="w-fit">
                <SparklesIcon data-icon="inline-start" aria-hidden="true" />
                {data.hero.eyebrow}
              </Badge>
              <div className="flex flex-col gap-5">
                <h1 className="max-w-4xl text-5xl leading-[0.95] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
                  {data.hero.headline}
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
                  {data.hero.subheadline}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <a href={data.hero.primaryCtaHref} target="_blank" rel="noreferrer">
                    Order Now
                    <ArrowUpRightIcon data-icon="inline-end" aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#services">Explore Services</a>
                </Button>
              </div>
            </div>

            <Card className="relative border-border/70 bg-card/70 shadow-2xl shadow-black/30">
              <CardHeader>
                <CardTitle>Landing Foundation</CardTitle>
                <CardDescription>
                  A polished shell for the public Kireiku experience, ready for richer
                  Release 1 section detail.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {data.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 px-4 py-3"
                    >
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <span className="font-mono text-2xl font-semibold tabular-nums">
                        {new Intl.NumberFormat("id-ID").format(stat.value)}
                        {stat.suffix}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <SectionContainer
          id="services"
          eyebrow="Services"
          title="Boosting services, shaped into a calmer buying flow."
          description="This shell validates active service rendering, ordering, and empty states before the full visual treatment lands in R1-07."
        >
          {data.services.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {data.services.map((service) => (
                <Card key={service.id} className="bg-card/75">
                  <CardHeader>
                    <Badge variant="outline" className="w-fit">
                      {service.serviceType}
                    </Badge>
                    <CardTitle>{service.gameName}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
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
        </SectionContainer>

        <SectionContainer
          id="why-kireiku"
          eyebrow="Why Kireiku"
          title="A tighter operation behind every order."
          description="Stats and differentiators are rendered from landing content with safe fallback copy."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {data.why.map((item) => (
              <Card key={item.title} className="bg-card/75">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          id="testimonials"
          eyebrow="Testimonials"
          title="Buyer proof will sit here once verified."
          description="Only visible testimonials render publicly. Placeholder testimonials stay hidden by default."
        >
          {data.testimonials.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {data.testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="bg-card/75">
                  <CardHeader>
                    <div className="flex gap-1 text-primary" aria-label={`${testimonial.rating} stars`}>
                      {Array.from({ length: testimonial.rating }).map((_, index) => (
                        <StarIcon key={index} aria-hidden="true" />
                      ))}
                    </div>
                    <CardTitle>{testimonial.buyerName}</CardTitle>
                    <CardDescription>{testimonial.game}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-muted-foreground">
                    “{testimonial.comment}”
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Verified buyer stories will appear here soon.
              </CardContent>
            </Card>
          )}
        </SectionContainer>

        <SectionContainer
          id="how-it-works"
          eyebrow="How It Works"
          title="A simple path from request to completed progress."
          description="The current shell keeps the sequence readable while the detailed motion and artwork wait for R1-07."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {data.howItWorks.map((step, index) => (
              <Card key={step.title} className="bg-card/75">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit font-mono">
                    {String(index + 1).padStart(2, "0")}
                  </Badge>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </SectionContainer>

        <SectionContainer
          id="faq"
          eyebrow="FAQ"
          title="Answers before the full FAQ treatment."
          description="FAQ content comes from dedicated FAQ rows, with all items collapsed by default."
        >
          <Card className="bg-card/75">
            <CardContent>
              <Accordion type="single" collapsible>
                {data.faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </SectionContainer>

        <SiteFooter footer={data.footer} />
      </div>
    </main>
  );
}
