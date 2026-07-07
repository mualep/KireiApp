"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Lock, RefreshCw, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// 5 Motivational Quotes
const MOTIVATIONAL_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
];

const SHIFT_OPTIONS = ["A", "B", "C", "D", "E", "F", "1", "2", "3", "flexible"];

export interface ConfigItem {
  id: string;
  game: string;
  phase: "before_work" | "while_work" | "after_work";
  sort_order: number;
  label: string;
}

interface DailyTaskFormProps {
  staff: {
    profile: {
      id: string;
      name: string;
      email: string;
      tier: string;
    };
  };
  initialWorkerStatus: {
    shift_active_label: string | null;
    current_status: string;
    shift_active_started_at: string | null;
  } | null;
  configs: ConfigItem[];
  games: string[];
}

export function DailyTaskForm({
  staff,
  initialWorkerStatus,
  configs,
  games,
}: DailyTaskFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Local Client Date (YYYY-MM-DD)
  const [todayDate] = useState(() => {
    const d = new Date();
    // SV-SE locale formats as exactly YYYY-MM-DD
    return d.toLocaleDateString("sv-SE");
  });

  // State values
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [editableUntil, setEditableUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [shiftLabel, setShiftLabel] = useState(
    initialWorkerStatus?.shift_active_label || "A"
  );
  const [streamName, setStreamName] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  
  // Checklist answers mapping: { [configId]: { checked: boolean, proof: string } }
  const [checklistAnswers, setChecklistAnswers] = useState<
    Record<string, { checked: boolean; proof: string }>
  >({});

  // Random Motivational Quote selected once on client mount
  const [quote, setQuote] = useState({ text: "", author: "" });

  useEffect(() => {
    const timer = setTimeout(() => {
      const randomIdx = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      setQuote(MOTIVATIONAL_QUOTES[randomIdx]);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const [version, setVersion] = useState(0);
  const triggerReload = () => setVersion((v) => v + 1);

  // Fetch today's checklist submission status
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const res = await fetch(`/api/daily-task/my?date=${todayDate}`);
        const data = await res.json();
        
        if (!isMounted) return;

        if (data.success && data.data) {
          const task = data.data;
          setTaskId(task.id);
          setTaskStatus(task.status);
          setEditableUntil(task.editable_until);
          
          if (task.shift_label) setShiftLabel(task.shift_label);
          if (task.stream_name) setStreamName(task.stream_name);
          if (task.selected_games) setSelectedGames(task.selected_games);
          
          // Map stored answers
          if (task.checklist_answers) {
            setChecklistAnswers(task.checklist_answers);
          }
        } else {
          // Reset if no task found for today
          setTaskId(null);
          setTaskStatus(null);
          setEditableUntil(null);
        }
      } catch (err) {
        console.error("Failed to load today's daily task status", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      setLoading(true);
      void load();
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [todayDate, version]);

  // Lock status calculation
  const isLocked = (() => {
    if (taskStatus === "approved") return true;
    if (editableUntil && new Date() > new Date(editableUntil)) return true;
    return false;
  })();

  const handleGameToggle = (game: string) => {
    if (isLocked) return;
    setSelectedGames((prev) =>
      prev.includes(game) ? prev.filter((g) => g !== game) : [...prev, game]
    );
  };

  const handleCheckboxChange = (configId: string, checked: boolean) => {
    if (isLocked) return;
    setChecklistAnswers((prev) => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        checked,
        proof: prev[configId]?.proof || "",
      },
    }));
  };

  const handleProofChange = (configId: string, proof: string) => {
    if (isLocked) return;
    setChecklistAnswers((prev) => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        checked: prev[configId]?.checked || false,
        proof,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    startTransition(async () => {
      try {
        const payload = {
          task_date: todayDate,
          shift_label: shiftLabel,
          stream_name: streamName || null,
          selected_games: selectedGames,
          checklist_answers: checklistAnswers,
        };

        const endpoint = taskId ? `/api/daily-task/${taskId}` : "/api/daily-task/submit";
        const method = taskId ? "PATCH" : "POST";

        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (result.success) {
          toast({
            title: "Checklist Terkirim",
            description: "Progres tugas harian berhasil disimpan.",
          });
          triggerReload();
          router.refresh();
        } else {
          toast({
            variant: "destructive",
            title: "Pengiriman Gagal",
            description: result.error || "Terjadi kesalahan saat menyimpan tugas.",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Pengiriman Gagal",
          description: "Gagal terhubung dengan server.",
        });
      }
    });
  };

  // Group configurations by phase
  const beforeWorkItems = configs.filter((c) => c.phase === "before_work");
  const whileWorkItems = configs.filter(
    (c) => c.phase === "while_work" && (c.game === "Lainnya" || selectedGames.includes(c.game))
  );
  const afterWorkItems = configs.filter((c) => c.phase === "after_work");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Memuat formulir harian...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Locked status banner */}
      {isLocked && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm font-medium shadow-md shadow-destructive/5 animate-pulse">
          <Lock className="size-5 shrink-0" />
          <span>Formulir terkunci (batas waktu 24 jam terlewati atau tugas telah disetujui).</span>
        </div>
      )}

      {/* Quote Card */}
      {quote.text && (
        <Card className="border border-primary/20 bg-primary/5 shadow-md rounded-xl overflow-hidden relative">
          <div className="absolute right-4 top-4 text-primary/10 opacity-30 select-none pointer-events-none">
            <Flame className="size-20" />
          </div>
          <CardContent className="p-6 relative z-10 flex flex-col gap-1.5">
            <p className="font-serif italic text-base md:text-lg text-foreground/90 leading-relaxed">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="text-xs md:text-sm text-primary font-bold tracking-wide uppercase">
              &mdash; {quote.author}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Form Fields */}
      <Card className="tracker-glass-panel rounded-xl border p-6 md:p-8 flex flex-col gap-6 shadow-xl shadow-primary/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field>
            <FieldLabel>Player Name</FieldLabel>
            <Input
              value={staff.profile.name}
              readOnly
              disabled
              className="bg-muted/40 cursor-not-allowed select-none font-bold"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="shift-select">Aktifkan Shift</FieldLabel>
            <Select
              id="shift-select"
              value={shiftLabel}
              onChange={(e) => setShiftLabel(e.target.value)}
              disabled={isLocked || isPending}
            >
              {SHIFT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  Shift {opt.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field>
            <FieldLabel htmlFor="stream-input">Stream Name / Link</FieldLabel>
            <Input
              id="stream-input"
              value={streamName}
              onChange={(e) => setStreamName(e.target.value)}
              placeholder="e.g. YouTube / Twitch stream link"
              disabled={isLocked || isPending}
            />
          </Field>

          <Field>
            <FieldLabel>Pilihan Game Hari Ini</FieldLabel>
            <div className="flex flex-wrap gap-2.5 mt-1">
              {games.map((game) => {
                const active = selectedGames.includes(game);
                return (
                  <button
                    key={game}
                    type="button"
                    onClick={() => handleGameToggle(game)}
                    disabled={isLocked || isPending}
                    className={cn(
                      "h-9 px-4 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      active
                        ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                        : "border-input-border bg-input-bg text-muted-foreground hover:bg-input-bg/70"
                    )}
                  >
                    {game}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </Card>

      {/* Phase Sections */}
      <div className="flex flex-col gap-6">
        {/* Phase: Before Work */}
        {beforeWorkItems.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
              <Badge variant="outline" className="h-6 border-status-break/40 bg-status-break/10 text-status-break font-bold uppercase tracking-wider">
                Phase 1
              </Badge>
              <h3 className="text-lg font-bold text-foreground">Before Work</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {beforeWorkItems.map((item) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  answer={checklistAnswers[item.id]}
                  isLocked={isLocked || isPending}
                  onCheckChange={(val) => handleCheckboxChange(item.id, val)}
                  onProofChange={(val) => handleProofChange(item.id, val)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Phase: While Work */}
        {whileWorkItems.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
              <Badge variant="outline" className="h-6 border-primary/40 bg-primary/10 text-primary font-bold uppercase tracking-wider animate-pulse">
                Phase 2
              </Badge>
              <h3 className="text-lg font-bold text-foreground">While Work (Active Games)</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {whileWorkItems.map((item) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  answer={checklistAnswers[item.id]}
                  isLocked={isLocked || isPending}
                  onCheckChange={(val) => handleCheckboxChange(item.id, val)}
                  onProofChange={(val) => handleProofChange(item.id, val)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Phase: After Work */}
        {afterWorkItems.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 px-1">
              <Badge variant="outline" className="h-6 border-status-sakit/40 bg-status-sakit/10 text-status-sakit font-bold uppercase tracking-wider">
                Phase 3
              </Badge>
              <h3 className="text-lg font-bold text-foreground">After Work</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {afterWorkItems.map((item) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  answer={checklistAnswers[item.id]}
                  isLocked={isLocked || isPending}
                  onCheckChange={(val) => handleCheckboxChange(item.id, val)}
                  onProofChange={(val) => handleProofChange(item.id, val)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submission Footer */}
      {!isLocked && (
        <div className="flex justify-end p-1">
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 px-8 font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center gap-2"
          >
            {isPending && <RefreshCw className="size-4 animate-spin" />}
            {taskId ? "Perbarui Tugas Harian" : "Kirim Tugas Harian"}
          </Button>
        </div>
      )}
    </form>
  );
}

interface ChecklistItemCardProps {
  item: ConfigItem;
  answer?: { checked: boolean; proof: string };
  isLocked: boolean;
  onCheckChange: (checked: boolean) => void;
  onProofChange: (proof: string) => void;
}

function ChecklistItemCard({
  item,
  answer = { checked: false, proof: "" },
  isLocked,
  onCheckChange,
  onProofChange,
}: ChecklistItemCardProps) {
  return (
    <Card className="tracker-glass-panel rounded-xl border p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/2">
      <div className="flex items-start gap-4 flex-1">
        <div className="mt-1 flex items-center justify-center">
          <input
            type="checkbox"
            id={`check-${item.id}`}
            checked={answer.checked}
            onChange={(e) => onCheckChange(e.target.checked)}
            disabled={isLocked}
            className="size-5 shrink-0 rounded border-input-border bg-input-bg text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`check-${item.id}`}
            className={cn(
              "text-sm font-bold leading-snug cursor-pointer select-none",
              answer.checked ? "text-muted-foreground/60 line-through" : "text-foreground"
            )}
            translate="no"
          >
            {item.label}
          </label>
          {item.phase === "while_work" && (
            <Badge variant="outline" className="h-5 text-[10px] w-fit font-semibold border-primary/20 bg-primary/5 text-primary">
              {item.game}
            </Badge>
          )}
        </div>
      </div>

      <div className="w-full md:w-80 shrink-0">
        <Textarea
          id={`proof-${item.id}`}
          placeholder="Tautan bukti / Note hasil pengerjaan..."
          value={answer.proof}
          onChange={(e) => onProofChange(e.target.value)}
          disabled={isLocked}
          rows={2}
          className="resize-none text-xs rounded-lg min-h-[56px] focus-visible:ring-primary/45"
        />
      </div>
    </Card>
  );
}
