import { Button } from "@cloudflare/kumo/components/button";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Input } from "@cloudflare/kumo/components/input";
import { Text } from "@cloudflare/kumo/components/text";
import { useKumoToastManager } from "@cloudflare/kumo/components/toast";
import { Waveform } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { WaveCard } from "../components/WaveCard";
import { useUserWaves } from "../hooks/useUserWaves";
import { PageHeader } from "../layout/PageHeader";
import { clearOperate, V4Channel } from "../lib/protocol";
import { WAVE_PRESETS, sendPulse } from "../lib/waves";
import type { UserWave } from "../lib/pulse/store";
import { useConsole } from "../state/ConsoleProvider";

export function WavesPage() {
  const { relay, canControl, recorder, requirePaired } = useConsole();
  const { waves, importFiles, remove, rename } = useUserWaves();
  const toast = useKumoToastManager();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  function play(name: string, frames: readonly string[], durationMs: number, ch: 0 | 1) {
    if (!requirePaired()) return;
    if (!relay.slotId) return;
    const key = `${name}-${ch}`;
    setBusy(key);
    relay.sendRpc(clearOperate(relay.slotId));
    const ms = Math.max(1000, Math.min(durationMs || 5000, 30_000));
    const ok = relay.sendRpc(
      sendPulse(
        relay.slotId,
        ch === 0 ? V4Channel.A : V4Channel.B,
        [...frames],
        ms,
      ),
    );
    if (ok) {
      recorder.markWave(name);
      toast.add({
        title: `已下发 ${ch === 0 ? "A" : "B"} · ${Math.round(ms / 1000)}s`,
        variant: "success",
      });
    }
    window.setTimeout(() => setBusy(null), 800);
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImporting(true);
    try {
      const { ok, fail } = await importFiles(files);
      if (ok && fail.length === 0) {
        toast.add({ title: `已导入 ${ok} 个波形`, variant: "success" });
      } else if (ok) {
        toast.add({
          title: `${ok} 成功，${fail.length} 失败`,
          description: fail.slice(0, 3).join("；"),
          variant: "warning",
        });
      } else {
        toast.add({
          title: "导入失败",
          description: fail.slice(0, 3).join("；") || "无法解析",
          variant: "error",
        });
      }
    } catch (e) {
      toast.add({
        title: "导入失败",
        description: e instanceof Error ? e.message : String(e),
        variant: "error",
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="波形库"
        description="内置预设与本机导入的 .pulse / zip。"
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pulse,.zip,application/zip"
              multiple
              className="hidden"
              onChange={(e) => void onFiles(e.target.files)}
            />
            <Button
              size="sm"
              loading={importing}
              onClick={() => fileRef.current?.click()}
            >
              导入
            </Button>
          </>
        }
      />

      {!canControl ? (
        <div className="dg-panel px-4 py-3">
          <Text variant="secondary">配对完成后可下发。卡片仍可浏览。</Text>
        </div>
      ) : null}

      <section
        className="flex flex-col gap-3"
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          void onFiles(e.dataTransfer.files);
        }}
      >
        <Text variant="heading3" as="h2">
          内置
        </Text>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {WAVE_PRESETS.map((w) => (
            <WaveCard
              key={w.id}
              name={w.name}
              hint="试播 5 秒"
              canControl={canControl}
              busyA={busy === `${w.name}-0`}
              busyB={busy === `${w.name}-1`}
              onBlocked={() => requirePaired()}
              onPlay={(ch) => play(w.name, w.frames, 5000, ch)}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Text variant="heading3" as="h2">
          我的波形
        </Text>
        {waves.length === 0 ? (
          <EmptyState
            icon={Waveform}
            title="还没有导入波形"
            description="选择 .pulse 或包含多个 .pulse 的 zip。"
            action={{ label: "导入", onClick: () => fileRef.current?.click() }}
          />
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {waves.map((w) => (
              <WaveCard
                key={w.id}
                name={w.name}
                hint={`${Math.max(1, Math.round(w.durationMs / 1000))} 秒 · ${w.frames.length} 帧`}
                canControl={canControl}
                busyA={busy === `${w.name}-0`}
                busyB={busy === `${w.name}-1`}
                onBlocked={() => requirePaired()}
                onPlay={(ch) => playUser(w, ch)}
                extra={
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenameId(w.id);
                        setRenameVal(w.name);
                      }}
                    >
                      重命名
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoveId(w.id)}
                    >
                      删除
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>
      <Text variant="secondary" size="xs">
        可视化编辑器下一步再做。可把 .pulse / zip 拖进本页。
      </Text>

      {renameId ? (
        <Dialog.Root open onOpenChange={(o) => !o && setRenameId(null)}>
          <Dialog className="p-6">
            <Dialog.Title>重命名</Dialog.Title>
            <div className="mt-4 flex flex-col gap-3">
              <Input
                label="名称"
                value={renameVal}
                onChange={(e) => setRenameVal(e.currentTarget.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setRenameId(null)}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    const n = renameVal.trim();
                    if (n) rename(renameId, n);
                    setRenameId(null);
                  }}
                >
                  保存
                </Button>
              </div>
            </div>
          </Dialog>
        </Dialog.Root>
      ) : null}

      {removeId ? (
        <Dialog.Root open onOpenChange={(o) => !o && setRemoveId(null)}>
          <Dialog className="p-6">
            <Dialog.Title>删除这个波形？</Dialog.Title>
            <Dialog.Description>仅从本机列表移除。</Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRemoveId(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  remove(removeId);
                  setRemoveId(null);
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

  function playUser(w: UserWave, ch: 0 | 1) {
    play(w.name, w.frames, w.durationMs || 5000, ch);
  }
}
