"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KeywordPlannerRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/keywords?tab=pesquisar"); }, [router]);
  return null;
}
