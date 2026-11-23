"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BarChart3, CheckCheck, Bot, Layers, Library, LogOut, Mail, MessagesSquare } from "lucide-react";
import { supabase, variaveisFaltando } from "@/lib/supabase";
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
  const faltam = variaveisFaltando();
  if (faltam.length > 0) return <SemConfiguracao faltam={faltam} />;
  return <Painel />;
}

/** Erro claro quando o deploy foi feito sem as variáveis do Supabase (ex.: preview da Vercel). */
function SemConfiguracao({ faltam }: { faltam: string[] }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6">
      <div role="alert" className="w-full max-w-md space-y-4">
        <Marca variante="empilhada" className="-ml-3 w-[150px]" />
        <h1 className="font-display text-[32px] leading-tight">Configuração incompleta</h1>
        <p className="text-[15px] text-ink-2">Este endereço foi publicado sem as variáveis de ambiente do Supabase, então o painel não consegue se conectar.</p>
        <ul className="space-y-1 rounded-xl border border-line bg-surface p-3.5 font-mono text-[13px] text-ink">{faltam.map((v) => <li key={v}>{v}</li>)}</ul>
        <p className="text-[13px] text-muted">Na Vercel: Settings › Environment Variables, marque também o ambiente Preview (ou Production) nessas variáveis e faça um novo deploy.</p>
      </div>
    </main>
  );
}

function Painel() {
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

/** Logotipo oficial (SVG em paths, variante para fundo escuro). */
function Marca({ variante = "horizontal", className }: { variante?: "horizontal" | "empilhada" | "monograma"; className?: string }) {
  const arq = { horizontal: ["rafa-studio-horizontal-dark.svg", 735, 184], empilhada: ["rafa-studio-stacked-dark.svg", 540, 285], monograma: ["rafa-studio-monogram-dark.svg", 256, 256] }[variante];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/marca/${arq[0]}`} width={arq[1] as number} height={arq[2] as number} alt="Rafa Studio" className={cn("block h-auto select-none", className)} draggable={false} />;
}

function Carregando() {
  return <main className="grid min-h-dvh place-items-center bg-bg"><Marca variante="monograma" className="w-20 animate-pulse motion-reduce:animate-none" /></main>;
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
    <main className="grid min-h-dvh bg-bg lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-line bg-[radial-gradient(120%_80%_at_85%_0%,var(--rs-plum)_0%,var(--rs-noir)_60%)] p-12">
        <Marca variante="empilhada" className="-ml-4 w-[200px]" />
        <div className="max-w-md">
          <p className="rs-tagline text-[56px] leading-[1.05]">Da ideia ao próximo take.</p>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-2">Converse com o Command Center, acompanhe o trabalho dos agentes e aprove cada versão sem sair do painel.</p>
        </div>
        <p className="text-xs text-muted">Painel privado. Acesso só para e-mails autorizados.</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Marca variante="empilhada" className="mb-8 -ml-3 w-[168px] lg:hidden" />
          {enviado ? (
            <div className="space-y-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-ok-soft text-ok"><Mail className="size-5" /></div>
              <h2 className="font-display text-[32px] leading-tight">Confira seu e-mail</h2>
              <p className="text-ink-2 text-[15px]">Enviamos um link de acesso para <strong className="text-ink">{email}</strong>. Abra no mesmo navegador.</p>
              <Botao variante="fantasma" tamanho="sm" className="-ml-3" onClick={() => setEnviado(false)}>Usar outro e-mail</Botao>
            </div>
          ) : (
            <form onSubmit={entrar} className="space-y-5">
              <div>
                <h2 className="font-display text-[40px] leading-tight">Entrar</h2>
                <p className="mt-1 text-ink-2 text-[15px]">Você recebe um link de acesso por e-mail. Sem senha.</p>
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">E-mail</span>
                <input
                  type="email" required autoFocus placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--rs-champagne)] focus:border-brand/70"
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

const ABAS: { id: Aba; nome: string; curto?: string; icone: React.ElementType }[] = [
  { id: "conteudos", nome: "Conteúdos", icone: Layers },
  { id: "chat", nome: "Chat", icone: MessagesSquare },
  { id: "biblioteca", nome: "Biblioteca", icone: Library },
  { id: "aprovacoes", nome: "Aprovações", icone: CheckCheck },
  { id: "metricas", nome: "Métricas", icone: BarChart3 },
  { id: "tarefas", nome: "Atividade dos agentes", curto: "Atividade", icone: Bot },
];

function Studio({ email }: { email: string }) {
  const [aba, setAba] = useState<Aba>("conteudos");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [abrir, setAbrir] = useState<{ resultado?: string; serie?: string; n: number }>({ n: 0 });
  const { linhas: aprovacoes } = useTabela<Aprovacao>("aprovacoes", { ordem: "criado_em" });
  const pendentes = aprovacoes.filter((a) => a.estado === "pendente").length;
  const sair = () => supabase().auth.signOut();

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {/* Barra lateral (desktop) */}
      <aside className="hidden lg:flex w-[252px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5">
        <Marca variante="empilhada" className="w-[150px]" />
        <div className="mx-3 mt-3 h-px bg-line" />
        <nav aria-label="Navegação principal" className="mt-5 space-y-1">
          {ABAS.map(({ id, nome, icone: Icone }) => (
            <button
              key={id}
              onClick={() => { if (id === "conteudos") setAbrir({ n: abrir.n + 1 }); setAba(id); }}
              aria-current={aba === id ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-150 cursor-pointer",
                aba === id ? "bg-surface-3 text-ink before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-full before:bg-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icone className={cn("size-[18px]", aba === id && "text-brand")} />
              <span className="flex-1 text-left">{nome}</span>
              {id === "aprovacoes" && pendentes > 0 && <span className="grid min-w-5 h-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-ink">{pendentes}</span>}
            </button>
          ))}
        </nav>
        {pendentes > 0 && aba !== "aprovacoes" && (
          <Cartao className="mt-6 p-3.5 bg-warn-soft border-warn/30">
            <p className="text-[13px] font-medium text-warn">{pendentes === 1 ? "1 entrega esperando sua decisão" : `${pendentes} entregas esperando sua decisão`}</p>
            <Botao tamanho="sm" variante="contorno" className="mt-2.5 w-full" onClick={() => setAba("aprovacoes")}>Revisar agora</Botao>
          </Cartao>
        )}
        <div className="mt-auto flex items-center gap-2.5 rounded-xl px-2 py-2">
          <div className="grid size-8 place-items-center rounded-full bg-surface-2 text-[13px] font-semibold">{email.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1 truncate text-[13px] text-ink-2" title={email}>{email}</div>
          <Botao variante="fantasma" tamanho="icone" title="Sair" aria-label="Sair" onClick={sair}><LogOut className="size-4" /></Botao>
        </div>
      </aside>

      {/* Topo (celular) */}
      <header className="lg:hidden flex items-center justify-between border-b border-line bg-surface px-4 py-2 pt-[max(.5rem,env(safe-area-inset-top))]">
        <Marca className="h-9 w-auto -ml-1.5" />
        <Botao variante="fantasma" tamanho="icone" aria-label="Sair" onClick={sair}><LogOut className="size-4" /></Botao>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="hidden lg:flex h-14 shrink-0 items-center border-b border-line px-8">
        <p className="rs-tagline text-[22px]">Da ideia ao próximo take.</p>
      </div>
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {aba === "chat" && <Chat conversaId={conversaId} setConversaId={setConversaId} />}
        {aba === "tarefas" && <Tarefas />}
        {aba === "biblioteca" && <Biblioteca />}
        {aba === "conteudos" && <Conteudos key={abrir.n} abrirResultado={abrir.resultado} abrirSerie={abrir.serie} />}
        {aba === "aprovacoes" && <Aprovacoes verResultado={(id) => { setAbrir({ resultado: id, n: abrir.n + 1 }); setAba("conteudos"); }} />}
        {aba === "metricas" && <Metricas abrir={(serie) => { setAbrir({ serie, n: abrir.n + 1 }); setAba("conteudos"); }} />}
      </main>
      </div>

      {/* Abas (celular) */}
      <nav aria-label="Navegação principal" className="lg:hidden grid grid-cols-6 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        {ABAS.map(({ id, nome, curto, icone: Icone }) => (
          <button key={id} onClick={() => setAba(id)} aria-current={aba === id ? "page" : undefined} className={cn("relative flex min-h-[54px] min-w-0 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium cursor-pointer", aba === id ? "text-ink before:absolute before:top-0 before:left-1/4 before:right-1/4 before:h-[2px] before:rounded-full before:bg-brand" : "text-ink-2")}>
            <Icone className={cn("size-5", aba === id && "text-brand")} />
            <span className="max-w-full truncate tracking-[-0.015em]">{curto ?? nome}</span>
            {id === "aprovacoes" && pendentes > 0 && <span className="absolute right-[14%] top-1 grid min-w-4 h-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-ink">{pendentes}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}
