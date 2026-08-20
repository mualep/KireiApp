"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EnterpriseRuleDTO } from "@/lib/rules/data";
import { EditRuleDialog } from "@/components/admin/rules/edit-rule-dialog";
import {
  Edit3,
  FileText,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EnterpriseRulesClientShellProps = {
  rules: EnterpriseRuleDTO[];
  tier: string;
};

export function EnterpriseRulesClientShell({
  rules,
  tier,
}: EnterpriseRulesClientShellProps) {
  const isOwner = tier === "owner";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingRule, setEditingRule] = useState<EnterpriseRuleDTO | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    rules.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [rules]);

  // Filter rules based on search & category
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchCategory =
        selectedCategory === "all" || r.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        (r.category && r.category.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [rules, selectedCategory, searchQuery]);

  function handleOpenCreate() {
    setEditingRule(null);
    setIsDialogOpen(true);
  }

  function handleOpenEdit(rule: EnterpriseRuleDTO) {
    setEditingRule(rule);
    setIsDialogOpen(true);
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Top Action for Owner */}
      {isOwner ? (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 shadow-md text-xs h-9 px-4 font-bold"
          >
            <Plus className="size-4" />
            <span>Tambah Peraturan</span>
          </Button>
        </div>
      ) : null}

      {/* Filter and Search Section */}
      <div className="flex flex-col gap-3">
        {/* Search Input on Top (Full Width) */}
        <div className="relative w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pasal atau kata kunci tata tertib..."
            className="pl-9 text-xs h-9 w-full bg-card/60"
          />
        </div>

        {/* Category Pills (flex-wrap) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            Semua ({rules.length})
          </button>
          {categories.map((cat) => {
            const count = rules.filter((r) => r.category === cat).length;
            const displayLabel = cat === "Payroll" ? "Gaji" : cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {displayLabel} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion List Container */}
      <Card className="tracker-glass-panel rounded-2xl border shadow-xl shadow-primary/5 overflow-hidden">
        <CardContent className="p-4 md:p-6">
          {filteredRules.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <FileText className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-muted-foreground">
                Tidak ada peraturan yang cocok dengan pencarian Anda.
              </p>
            </div>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={filteredRules.slice(0, 3).map((r) => r.id)}
              className="w-full flex flex-col gap-3"
            >
              {filteredRules.map((rule, idx) => {
                const cleanTitle = rule.title.replace(/^\d+\.?\s*/, "");
                const displayCategory = rule.category === "Payroll" ? "Gaji" : rule.category;

                return (
                  <AccordionItem
                    key={rule.id}
                    value={rule.id}
                    className="rounded-xl border border-border/70 bg-card/40 px-4 md:px-5 transition-all data-[state=open]:border-primary/40 data-[state=open]:bg-card/70 data-[state=open]:shadow-md shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <AccordionTrigger className="hover:no-underline py-4 flex-1 text-left">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="size-7 rounded-lg bg-primary/10 border border-primary/20 text-primary font-black text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <span className="font-bold text-foreground text-sm md:text-base leading-snug">
                            {cleanTitle}
                          </span>
                          {displayCategory ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold border-border bg-muted/40 hidden sm:inline-flex"
                            >
                              {displayCategory}
                            </Badge>
                          ) : null}
                        </div>
                      </AccordionTrigger>

                      {isOwner ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(rule);
                          }}
                          title="Edit Pasal"
                          className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <Edit3 className="size-4" />
                        </Button>
                      ) : null}
                    </div>

                    <AccordionContent className="pb-5 pt-1 text-xs md:text-sm text-foreground/90 leading-relaxed border-t border-border/30 mt-1">
                      <div className="font-sans leading-relaxed pt-3">
                        <ReactMarkdown
                          components={{
                            h3: ({ node, ...props }) => (
                              <h3
                                className="text-sm font-bold mt-4 mb-2 text-foreground"
                                {...props}
                              />
                            ),
                            strong: ({ node, ...props }) => (
                              <strong
                                className="font-bold text-foreground"
                                {...props}
                              />
                            ),
                            p: ({ node, ...props }) => (
                              <p className="mb-2.5 leading-relaxed" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                              <ul
                                className="list-disc pl-5 mb-3 space-y-1"
                                {...props}
                              />
                            ),
                            ol: ({ node, ...props }) => (
                              <ol
                                className="list-decimal pl-5 mb-3 space-y-1"
                                {...props}
                              />
                            ),
                            li: ({ node, ...props }) => (
                              <li className="leading-relaxed" {...props} />
                            ),
                            hr: ({ node, ...props }) => (
                              <hr className="my-3 border-border/50" {...props} />
                            ),
                            a: ({ node, ...props }) => (
                              <a
                                className="text-primary underline hover:text-primary/80 break-all"
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                              />
                            ),
                          }}
                        >
                          {rule.content}
                        </ReactMarkdown>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Dialog for Edit / Create */}
      <EditRuleDialog
        key={editingRule?.id || "new"}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        rule={editingRule}
      />
    </div>
  );
}
