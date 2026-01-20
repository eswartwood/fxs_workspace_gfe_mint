import { buildFXS } from "../../../builder/fxs-builder";
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Read multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Build SmartFile
    const workspaceDir = process.cwd();
    const fxsBuffer = await buildFXS(fileBuffer, workspaceDir);

    return new NextResponse(fxsBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=output.fxs"
      }
    });

  } catch (err) {
    console.error("Mint engine error:", err);
    return NextResponse.json({ error: "Mint failed" }, { status: 500 });
  }
}
