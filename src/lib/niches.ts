import {
  Cpu, HeartPulse, Banknote, GraduationCap, ShoppingCart,
  Megaphone, Scale, Home, Utensils, Car, Shirt, Palette,
  PawPrint, Plane, Trophy, Gamepad2, Baby, Wheat, HardHat, Leaf,
  type LucideIcon,
} from "lucide-react";

export type NicheOption = {
  value: string;
  icon: LucideIcon;
  color: string;
};

export const NICHE_OPTIONS: readonly NicheOption[] = [
  { value: "Tecnologia", icon: Cpu, color: "text-sky-400" },
  { value: "Saúde", icon: HeartPulse, color: "text-red-400" },
  { value: "Finanças", icon: Banknote, color: "text-emerald-400" },
  { value: "Educação", icon: GraduationCap, color: "text-amber-400" },
  { value: "E-commerce", icon: ShoppingCart, color: "text-orange-400" },
  { value: "Marketing", icon: Megaphone, color: "text-pink-400" },
  { value: "Jurídico", icon: Scale, color: "text-slate-300" },
  { value: "Imobiliário", icon: Home, color: "text-yellow-500" },
  { value: "Alimentação", icon: Utensils, color: "text-orange-300" },
  { value: "Automotivo", icon: Car, color: "text-blue-400" },
  { value: "Moda", icon: Shirt, color: "text-fuchsia-400" },
  { value: "Beleza", icon: Palette, color: "text-rose-400" },
  { value: "Pets", icon: PawPrint, color: "text-amber-300" },
  { value: "Viagem", icon: Plane, color: "text-cyan-400" },
  { value: "Esportes", icon: Trophy, color: "text-yellow-400" },
  { value: "Jogos", icon: Gamepad2, color: "text-violet-400" },
  { value: "Infantil", icon: Baby, color: "text-pink-300" },
  { value: "Agronegócio", icon: Wheat, color: "text-yellow-600" },
  { value: "Construção", icon: HardHat, color: "text-orange-500" },
  { value: "Sustentabilidade", icon: Leaf, color: "text-green-400" },
] as const;

export const NICHE_VALUES = NICHE_OPTIONS.map((n) => n.value);

/** Quick lookup by value */
export function getNiche(value: string | null | undefined): NicheOption | undefined {
  if (!value) return undefined;
  return NICHE_OPTIONS.find((n) => n.value === value);
}
