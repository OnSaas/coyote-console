import JSZip from "jszip";

export async function extractPulseFiles(
  file: File,
): Promise<Array<{ name: string; text: string }>> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const out: Array<{ name: string; text: string }> = [];
  const jobs: Promise<void>[] = [];
  zip.forEach((path, entry) => {
    if (entry.dir) return;
    const base = path.split("/").pop() || path;
    if (base.startsWith(".") || path.includes("__MACOSX")) return;
    if (!base.toLowerCase().endsWith(".pulse")) return;
    jobs.push(
      entry.async("string").then((text) => {
        out.push({ name: base.replace(/\.pulse$/i, ""), text });
      }),
    );
  });
  await Promise.all(jobs);
  if (out.length === 0) throw new Error("zip 内没有 .pulse 文件");
  return out;
}
