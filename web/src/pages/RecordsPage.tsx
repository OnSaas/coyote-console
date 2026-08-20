import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Input } from "@cloudflare/kumo/components/input";
import { Text } from "@cloudflare/kumo/components/text";
import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { ChartBar } from "@phosphor-icons/react";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { EmptyState } from "../components/EmptyState";
import { emptyManual } from "../hooks/useSessionRecorder";
import {
  formatClock,
  formatDuration,
  shareText,
  type RecordTag,
  type SessionRecord,
} from "../lib/records";
import { PageHeader } from "../layout/PageHeader";
import { useConsole } from "../state/ConsoleProvider";

type Filter = "all" | "today" | "week";

export function RecordsPage() {
  const { recorder } = useConsole();
  const toast = useKumoToastManager();
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState<SessionRecord | null>(null);
  const [share, setShare] = useState<SessionRecord | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = now - 7 * 86400000;

  const list = recorder.records.filter((r) => {
    if (filter === "today") return r.startedAt >= startOfDay.getTime();
    if (filter === "week") return r.startedAt >= weekAgo;
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="记录"
        description="自动保存与手动记一笔，数据只在本机。"
        actions={
          <Button size="sm" onClick={() => setDraft(emptyManual())}>
            记一笔
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {(["today", "week", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "primary" : "secondary"}
            onClick={() => setFilter(f)}
          >
            {f === "today" ? "今天" : f === "week" ? "本周" : "全部"}
          </Button>
        ))}
      </div>

      {recorder.live ? (
        <section className="dg-panel p-4">
          <Text variant="body" bold>
            进行中 · {formatDuration(Date.now() - recorder.live.startedAt)}
          </Text>
          <Text variant="secondary" size="xs">
            最高 A {recorder.live.maxA} / B {recorder.live.maxB} · 急停{" "}
            {recorder.live.stops}
          </Text>
        </section>
      ) : null}

      <div className="flex flex-col gap-3">
        {list.length === 0 ? (
          <EmptyState
            icon={ChartBar}
            title="还没有战绩"
            description="开启自动保存并完成一次会话，或点「记一笔」。"
            action={{ label: "记一笔", onClick: () => setDraft(emptyManual()) }}
          />
        ) : (
          <div className="dg-panel overflow-x-auto">
            <div className="dg-table-row dg-table-head">
              <span>时间</span>
              <span>时长</span>
              <span>最高 A</span>
              <span>最高 B</span>
              <span>备注</span>
              <span>操作</span>
            </div>
            {list.map((r) => (
              <div key={r.id} className="dg-table-row">
                <Text variant="body">{formatClock(r.startedAt)}</Text>
                <Text variant="secondary" size="sm">
                  {formatDuration(r.durationMs)}
                </Text>
                <span className="dg-gold">{r.maxA}</span>
                <span className="dg-gold">{r.maxB}</span>
                <Text variant="secondary" size="sm">
                  {r.note || "—"}
                </Text>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => setShare(r)}>
                    分享
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRemoveId(r.id)}>
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {draft ? (
        <ManualDialog
          draft={draft}
          onChange={setDraft}
          onSave={() => {
            recorder.saveManual(draft);
            setDraft(null);
            toast.add({ title: "已保存", variant: "success" });
          }}
          onClose={() => setDraft(null)}
        />
      ) : null}

      {share ? <ShareDialog rec={share} onClose={() => setShare(null)} /> : null}
      {removeId ? (
        <Dialog.Root open onOpenChange={(o) => !o && setRemoveId(null)}>
          <Dialog className="p-6">
            <Dialog.Title>删除这条记录？</Dialog.Title>
            <Dialog.Description>仅从本机删除，无法恢复。</Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRemoveId(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  recorder.remove(removeId);
                  setRemoveId(null);
                  toast.add({ title: "已删除", variant: "success" });
                }}
              >
                删除
              </Button>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}
    </div>
  );
}

function ManualDialog({
  draft,
  onChange,
  onSave,
  onClose,
}: {
  draft: SessionRecord;
  onChange: (r: SessionRecord) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog className="p-6">
        <Dialog.Title>记一笔</Dialog.Title>
        <Dialog.Description>手动补一条战绩，保存在本机。</Dialog.Description>
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label="最高 A"
            type="number"
            value={String(draft.maxA)}
            onChange={(e) =>
              onChange({ ...draft, maxA: Number(e.currentTarget.value) || 0 })
            }
          />
          <Input
            label="最高 B"
            type="number"
            value={String(draft.maxB)}
            onChange={(e) =>
              onChange({ ...draft, maxB: Number(e.currentTarget.value) || 0 })
            }
          />
          <Input
            label="时长（秒）"
            type="number"
            value={String(Math.round(draft.durationMs / 1000))}
            onChange={(e) => {
              const sec = Number(e.currentTarget.value) || 0;
              onChange({
                ...draft,
                durationMs: sec * 1000,
                startedAt: draft.endedAt - sec * 1000,
              });
            }}
          />
          <Input
            label="备注"
            value={draft.note}
            onChange={(e) => onChange({ ...draft, note: e.currentTarget.value })}
          />
          <Input
            label="标签（练习 / 正式）"
            value={draft.tag}
            onChange={(e) =>
              onChange({ ...draft, tag: e.currentTarget.value as RecordTag })
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={onSave}>保存</Button>
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

function ShareDialog({ rec, onClose }: { rec: SessionRecord; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);

  async function exportPng() {
    if (!cardRef.current) return;
    const url = await toPng(cardRef.current, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = url;
    a.download = `dg-hub-${rec.id.slice(0, 8)}.png`;
    a.click();
  }

  function copyText() {
    void navigator.clipboard.writeText(shareText(rec));
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog className="p-6">
        <Dialog.Title>战绩卡片</Dialog.Title>
        <Dialog.Description>导出 PNG 或复制文案。</Dialog.Description>
        <div className="mt-4 flex justify-center">
          <div
            ref={cardRef}
            className="w-[320px] rounded-xl border border-[var(--dg-gold)] bg-[var(--dg-bg)] p-5 text-[var(--dg-text)]"
          >
            <div className="dg-gold mb-3 text-sm">DG-LAB · DG-HUB 战绩</div>
            <div className="dg-muted mb-4 text-xs">{formatClock(rec.startedAt)}</div>
            <div className="mb-2">时长 {formatDuration(rec.durationMs)}</div>
            <div className="mb-2">
              最高 A {rec.maxA}　　最高 B {rec.maxB}
            </div>
            <div className="mb-2">急停 {rec.stops} 次</div>
            {rec.note ? <div className="dg-muted mt-3 text-sm">备注：{rec.note}</div> : null}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={copyText}>
            复制文案
          </Button>
          <Button onClick={() => void exportPng()}>导出 PNG</Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
