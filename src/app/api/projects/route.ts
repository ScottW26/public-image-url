import { NextResponse } from "next/server";
import { getProjects } from "@/lib/atlas";

export const revalidate = 300;

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json(projects);
  } catch (err) {
    console.error("Projects API error:", err);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}
