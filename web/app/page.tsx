"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BarChart3, CheckCheck, KanbanSquare, Layers, Library, LogOut, Mail, MessagesSquare, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Chat from "@/components/Chat";
import { Aprovacoes, Tarefas } from "@/components/Paineis";
import { Biblioteca, Conteudos } from "@/components/Conteudos";
import { Metricas } from "@/components/Metricas";
import { useTabela } from "@/lib/useTabela";
import type { Aprovacao } from "@/lib/tipos";
import { Aviso, Botao, Cartao } from "@/components/ui";
import { cn } from "@/lib/cn";

type Aba = "chat" | "conteudos" | "biblioteca" | "tarefas" | "aprovacoes" | "metricas";

export default function Pagina() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) return <Carregando />;
  if (!sessao) return <Login />;
  return <Studio email={sessao.user.email ?? ""} />;
}

function Marca({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-9 place-items-center rounded-xl bg-brand text-brand-ink shadow-sm"><Sparkles className="size-[18px]" /></div>
      <div className="leading-tight">
        <div className="font-display text-[19px] font-semibold tracking-tight">Rafa Studio</div>
        <div className="text-[11px] uppercase tracking-[.14em] text-muted">operação</div>
      </div>
    </div>
  );
}

function Carregando() {
  return <main className="grid min-h-dvh place-items-center"><div className="animate-pulse"><Marca /></div></main>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
    });
    setOcupado(false);
    if (error) setErro(error.message);
    else setEnviado(true);
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#2a1d23] p-12 text-[#f5e7ea]">
        <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-[#8f3f55]/40 blur-3xl" />
        <div className="absolute -bottom-32 left-10 size-[360px] rounded-full bg-[#a07a3c]/25 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-[#f5e7ea] text-[#2a1d23]"><Sparkles className="size-[18px]" /></div>
          <span className="font-display text-xl font-semibold">Rafa Studio</span>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-[44px] leading-[1.05] font-semibold tracking-tight">Do pedido ao roteiro aprovado, num só lugar.</h1>
          <p className="mt-4 text-[15px] text-[#f5e7ea]/75">Converse com o Command Center, acompanhe cada tarefa dos agentes e aprove as versões sem sair do painel.</p>
        </div>
        <p className="relative text-xs text-[#f5e7ea]/50">Painel privado. Acesso só para e-mails autorizados.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Marca className="mb-10 lg:hidden" />
          {enviado ? (
            <div className="space-y-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-ok-soft text-ok"><Mail className="size-5" /></div>
              <h2 className="font-display text-2xl font-semibold">Confira seu e-mail</h2>
              <p className="text-muted text-[15px]">Enviamos um link de acesso para <strong className="text-ink">{email}</strong>. Abra no mesmo navegador.</p>
              <Botao variante="fantasma" tamanho="sm" className="-ml-3" onClick={() => setEnviado(false)}>Usar outro e-mail</Botao>
            </div>
          ) : (
            <form onSubmit={entrar} className="space-y-5">
              <div>
                <h2 className="font-display text-[28px] font-semibold tracking-tight">Entrar</h2>
                <p className="mt-1 text-muted text-[15px]">Você recebe um link de acesso por e-mail. Sem senha.</p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">E-mail</span>
                <input
                  type="email" required autoFocus placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60"
                />
              </label>
              <Botao variante="primario" tamanho="lg" className="w-full" disabled={ocupado}>{ocupado ? "Enviando…" : "Receber link de acesso"}</Botao>
              {erro && <Aviso>{erro}</Aviso>}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

const ABAS: { id: Aba; nome: string; icone: React.ElementType }[] = [
  { id: "chat", nome: "Chat", icone: MessagesSquare },
  { id: "conteudos", nome: "Conteúdos", icone: Layers },
  { id: "biblioteca", nome: "Biblioteca", icone: Library },
  { id: "aprovacoes", nome: "Aprovações", icone: CheckCheck },
  { id: "tarefas", nome: "Tarefas", icone: KanbanSquare },
  { id: "metricas", nome: "Métricas", icone: BarChart3 },
];

function Studio({ email }: { email: string }) {
  const [aba, setAba] = useState<Aba>("chat");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [abrir, setAbrir] = useState<{ resultado?: string; serie?: string; n: number }>({ n: 0 });
  const { linhas: aprovacoes } = useTabela<Aprovacao>("aprovacoes", { ordem: "criado_em" });
  const pendentes = aprovacoes.filter((a) => a.estado === "pendente").length;
  const sair = () => supabase().auth.signOut();

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {/* Barra lateral (desktop) */}
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5">
        <Marca className="px-2" />
        <nav className="mt-8 space-y-1">
          {ABAS.map(({ id, nome, icone: Icone }) => (
            <button
              key={id}
              onClick={() => { if (id === "conteudos") setAbrir({ n: abrir.n + 1 }); setAba(id); }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition cursor-pointer",
                aba === id ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icone className="size-[18px]" />
              <span className="flex-1 text-left">{nome}</span>
              {id === "aprovacoes" && pendentes > 0 && <span className="grid min-w-5 h-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-ink">{pendentes}</span>}
            </button>
          ))}
        </nav>
        {pendentes > 0 && aba !== "aprovacoes" && (
          <Cartao className="mt-6 p-3.5 bg-warn-soft border-transparent">
            <p className="text-[13px] font-medium text-warn">{pendentes === 1 ? "1 entrega esperando sua decisão" : `${pendentes} entregas esperando sua decisão`}</p>
            <Botao tamanho="sm" variante="contorno" className="mt-2.5 w-full" onClick={() => setAba("aprovacoes")}>Revisar agora</Botao>
          </Cartao>
        )}
        <div className="mt-auto flex items-center gap-2.5 rounded-xl px-2 py-2">
          <div className="grid size-8 place-items-center rounded-full bg-surface-2 text-[13px] font-semibold">{email.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1 truncate text-[13px] text-muted" title={email}>{email}</div>
          <Botao variante="fantasma" tamanho="icone" title="Sair" aria-label="Sair" onClick={sair}><LogOut className="size-4" /></Botao>
        </div>
      </aside>

      {/* Topo (celular) */}
      <header className="lg:hidden flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <Marca />
        <Botao variante="fantasma" tamanho="icone" aria-label="Sair" onClick={sair}><LogOut className="size-4" /></Botao>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {aba === "chat" && <Chat conversaId={conversaId} setConversaId={setConversaId} />}
        {aba === "tarefas" && <Tarefas />}
        {aba === "biblioteca" && <Biblioteca />}
        {aba === "conteudos" && <Conteudos key={abrir.n} abrirResultado={abrir.resultado} abrirSerie={abrir.serie} />}
        {aba === "aprovacoes" && <Aprovacoes verResultado={(id) => { setAbrir({ resultado: id, n: abrir.n + 1 }); setAba("conteudos"); }} />}
        {aba === "metricas" && <Metricas abrir={(serie) => { setAbrir({ serie, n: abrir.n + 1 }); setAba("conteudos"); }} />}
      </main>

      {/* Abas (celular) */}
      <nav className="lg:hidden grid grid-cols-6 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        {ABAS.map(({ id, nome, icone: Icone }) => (
          <button key={id} onClick={() => setAba(id)} className={cn("relative flex min-w-0 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium cursor-pointer", aba === id ? "text-brand" : "text-muted")}>
            <Icone className="size-5" />
            {nome}
            {id === "aprovacoes" && pendentes > 0 && <span className="absolute right-[14%] top-1 grid min-w-4 h-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-ink">{pendentes}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
