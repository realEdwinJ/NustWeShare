import { NextRequest, NextResponse } from "next/server";
import { getModuleByCode, listModulePapers } from "@/lib/papers/queries";
import { downloadFilename, assessmentLabel } from "@/lib/papers/format";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/modules/[code]/bundle — manifest used by the client-side ZIP builder.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[a-z0-9]{2,20}$/i.test(code)) return jsonError("NOT_FOUND", "Module not found.", 404);
  try {
    const mod = await getModuleByCode(code);
    if (!mod) return jsonError("NOT_FOUND", "Module not found.", 404);
    const list = (await listModulePapers(mod.id)).filter((p) => p.hasFile);
    return NextResponse.json(
      {
        data: {
          module: { code: mod.code, name: mod.name },
          files: list.map((p) => ({
            paperId: p.id,
            filename: downloadFilename(p),
            folder: String(p.academicYear),
            label: `${assessmentLabel(p.assessmentType, p.assessmentNumber)} · ${p.academicYear} S${p.semester}`,
            size: p.fileSize,
            url: `/api/papers/${p.id}/download`,
          })),
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  } catch (e) {
    console.error("[api/modules/[code]/bundle]", e);
    return jsonError("DB_ERROR", "Could not load module files.", 500);
  }
}
