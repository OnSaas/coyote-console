import { Button } from "@cloudflare/kumo/components/button";
import { ClipboardText } from "@cloudflare/kumo/components/clipboard-text";
import { Dialog } from "@cloudflare/kumo/components/dialog";
import { Text } from "@cloudflare/kumo/components/text";
import { MagnifyingGlassPlus, QrCode } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

function useQrSize() {
  const [size, setSize] = useState(200);
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (w < 380) setSize(160);
      else if (w < 768) setSize(188);
      else setSize(220);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return size;
}

interface Props {
  qrUrl: string | null;
  waiting: boolean;
}

export function PairingCard({ qrUrl, waiting }: Props) {
  const qrSize = useQrSize();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 dg-gold">
        <QrCode />
        <Text variant="heading3" as="h2">
          配对二维码
        </Text>
      </div>
      {qrUrl ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg bg-white p-3">
            <QRCodeSVG value={qrUrl} size={qrSize} level="M" includeMargin={false} />
          </div>
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
          <Text variant="secondary" size="xs">
            {waiting ? "用 DG-LAB 4.0 APP 扫描" : "已接入后可保持此码备用"}
          </Text>
        </div>
      ) : (
        <Text variant="secondary">先点「连接中继」，再扫码。</Text>
      )}
    </div>
  );
}
