import { Button } from "@cloudflare/kumo/components/button";
import { ClipboardText } from "@cloudflare/kumo/components/clipboard-text";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Text } from "@cloudflare/kumo/components/text";
import { MagnifyingGlassPlus, QrCode } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  qrUrl: string | null;
  waiting: boolean;
}

export function PairingCard({ qrUrl, waiting }: Props) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 dg-gold">
        <QrCode size={20} />
        <Text variant="heading3" as="h2">
          配对二维码
        </Text>
      </div>
      {qrUrl ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="rounded-lg bg-white p-4">
            <QRCodeSVG value={qrUrl} size={240} level="M" includeMargin={false} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Dialog.Root>
              <Dialog.Trigger
                render={(props) => (
                  <Button variant="ghost" size="sm" icon={MagnifyingGlassPlus} {...props}>
                    放大
                  </Button>
                )}
              />
              <Dialog className="p-6">
                <Dialog.Title>扫描二维码</Dialog.Title>
                <Dialog.Description>DG-LAB 4.0 APP 扫码接入</Dialog.Description>
                <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
                  <QRCodeSVG value={qrUrl} size={280} level="M" />
                </div>
              </Dialog>
            </Dialog.Root>
            <ClipboardText text={qrUrl} size="sm" />
          </div>
          <Text variant="secondary" size="xs">
            {waiting ? "用 DG-LAB 4.0 APP 扫描" : "已接入后可保持此码备用"}
          </Text>
        </div>
      ) : (
        <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3 text-center">
          <QrCode size={48} className="text-[var(--dg-muted)]" />
          <Text variant="body">尚未连接</Text>
          <Text variant="secondary">点页头「连接中继」，二维码会出现在这里。</Text>
        </div>
      )}
    </div>
  );
}
