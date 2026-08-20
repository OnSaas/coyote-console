import { rpcReq } from "./protocol";

export function sendPulse(
  slotId: string,
  channel: 0 | 1,
  frames: string[],
  durationMs: number,
) {
  return rpcReq("device.op", {
    s: slotId,
    t: 0,
    c: channel,
    p: 1,
    d: durationMs,
    im: true,
    v: frames,
    ver: 3,
  });
}

export const WAVE_PRESETS = [
  {
    id: "breath",
    name: "呼吸",
    frames: ["0A0A0A0A14141414", "1414141428282828", "2828282814141414", "141414140A0A0A0A"],
  },
  {
    id: "tide",
    name: "潮汐",
    frames: ["0505050514141414", "0A0A0A0A28282828", "141414143C3C3C3C", "0A0A0A0A1E1E1E1E"],
  },
  {
    id: "heartbeat",
    name: "心跳",
    frames: ["3232323232323232", "0505050505050505", "2828282828282828", "0505050505050505"],
  },
] as const;
