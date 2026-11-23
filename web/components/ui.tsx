"use client";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/* Componentes base no padrão shadcn/ui (Tailwind + variantes), sem dependência de registro externo. */

type Variante = "primario" | "contorno" | "fantasma" | "suave" | "perigo";
type Tamanho = "sm" | "md" | "lg" | "icone";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-brand text-brand-ink hover:bg-brand-hover shadow-sm",
  contorno: "border border-line bg-surface-2 hover:bg-surface-3 text-ink",
  fantasma: "hover:bg-surface-2 text-ink-2 hover:text-ink",
  suave: "bg-brand-soft text-brand hover:brightness-110",
  perigo: "border border-bad/40 bg-bad-soft text-bad hover:brightness-110",
};
const TAMANHOS: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
  icone: "size-9 rounded-xl",
};

export const Botao = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamanho?: Tamanho }>(
  function Botao({ variante = "contorno", tamanho = "md", className, ...p }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150 select-none cursor-pointer",
          "disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:brightness-100",
          VARIANTES[variante], TAMANHOS[tamanho], className,
        )}
        {...p}
      />
    );
  },
);

export function Cartao({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-[0_8px_32px_rgba(0,0,0,.18)]", className)} {...p} />;
}

export type Tom = "neutro" | "marca" | "ok" | "alerta" | "erro" | "info" | "ouro";
const TONS: Record<Tom, string> = {
  neutro: "bg-surface-3 text-ink-2",
  marca: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok",
  alerta: "bg-warn-soft text-warn",
  erro: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  ouro: "bg-surface-2 text-gold",
};
export function Selo({ tom = "neutro", ponto, className, children }: { tom?: Tom; ponto?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium leading-5 whitespace-nowrap", TONS[tom], className)}>
      {ponto && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const CampoTexto = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function CampoTexto({ className, ...p }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn("w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60", className)}
      {...p}
    />
  );
});

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

export function Vazio({ icone, titulo, children, className }: { icone: React.ReactNode; titulo: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center gap-2 px-6 py-12", className)}>
      <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">{icone}</div>
      <h3 className="font-display text-[22px] mt-1">{titulo}</h3>
      {children && <div className="text-sm text-ink-2 max-w-sm">{children}</div>}
    </div>
  );
}

export function Aviso({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div role="alert" className={cn("rounded-xl bg-bad-soft text-bad px-3.5 py-2.5 text-sm", className)}>{children}</div>;
}
