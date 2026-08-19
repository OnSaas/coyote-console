import { Button } from "@cloudflare/kumo/components/button";
import { ClipboardText } from "@cloudflare/kumo/components/clipboard-text";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Text } from "@cloudflare/kumo/components/text";
import { ArrowsOut, QrCode } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";

interface Props {
  qrUrl: string | null;
}

export function PairingCard({ qrUrl }: Props) {
  return (
    <LayerCard>
      <LayerCard.Secondary>
        <QrCode />
        配对二维码
      </LayerCard.Secondary>
      <LayerCard.Primary>
        {qrUrl ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-lg bg-kumo-base p-3 ring-1 ring-kumo-line">
              <QRCodeSVG value={qrUrl} size={200} level="M" />
            </div>
            <ClipboardText
              text={qrUrl}
              size="sm"
              tooltip={{ text: "复制", copiedText: "已复制" }}
              labels={{ copyAction: "复制二维码链接" }}
            />
            <Text variant="secondary" size="xs">
              用 DG-LAB APP 扫描。配对前强度控制不可用。
            </Text>
            <Dialog.Root>
              <Dialog.Trigger
                render={(props) => (
                  <Button variant="ghost" size="sm" icon={ArrowsOut} {...props}>
                    放大
                  </Button>
                )}
              />
              <Dialog className="p-6">
                <Dialog.Title>扫描配对</Dialog.Title>
                <div className="mt-4 flex justify-center">
                  <div className="rounded-lg bg-kumo-base p-4 ring-1 ring-kumo-line">
                    <QRCodeSVG value={qrUrl} size={280} level="M" />
                  </div>
                </div>
              </Dialog>
            </Dialog.Root>
          </div>
        ) : (
          <Text variant="secondary">先点「连接中继」，再扫码。</Text>
        )}
      </LayerCard.Primary>
    </LayerCard>
  );
}
