"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Chat from "@/components/Chat";
import { Aprovacoes, Resultados, Tarefas } from "@/components/Paineis";
import { useTabela } from "@/lib/useTabela";
import type { Aprovacao } from "@/lib/tipos";

type Aba = "chat" | "tarefas" | "resultados" | "aprovacoes";

export default function Pagina() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) return <main className="centro"><p className="meta">Carregando…</p></main>;
  if (!sessao) return <Login />;
  return <Studio email={sessao.user.email ?? ""} />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
    });
    if (error) setErro(error.message);
    else setEnviado(true);
  }

  return (
    <main className="centro">
      <form className="login" onSubmit={entrar}>
        <h1>Rafa Studio</h1>
        {enviado ? (
          <p>Enviamos um link de acesso para <strong>{email}</strong>. Abra no mesmo navegador.</p>
        ) : (
          <>
            <input type="email" required placeholder="seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="botao primario">Receber link de acesso</button>
            {erro && <div className="aviso">{erro}</div>}
            <p className="meta">Só e-mails autorizados veem os dados.</p>
          </>
        )}
      </form>
    </main>
  );
}

function Studio({ email }: { email: string }) {
  const [aba, setAba] = useState<Aba>("chat");
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [resultadoAberto, setResultadoAberto] = useState<string | null>(null);
  const { linhas: aprovacoes } = useTabela<Aprovacao>("aprovacoes", { ordem: "criado_em" });
  const pendentes = aprovacoes.filter((a) => a.estado === "pendente").length;

  return (
    <div className="studio">
      <header>
        <strong>Rafa Studio</strong>
        <nav>
          <button className={aba === "chat" ? "ativa" : ""} onClick={() => setAba("chat")}>Chat</button>
          <button className={aba === "tarefas" ? "ativa" : ""} onClick={() => setAba("tarefas")}>Tarefas</button>
          <button className={aba === "resultados" ? "ativa" : ""} onClick={() => setAba("resultados")}>Resultados</button>
          <button className={aba === "aprovacoes" ? "ativa" : ""} onClick={() => setAba("aprovacoes")}>
            Aprovações{pendentes > 0 && <span className="selo">{pendentes}</span>}
          </button>
        </nav>
        <span className="meta">{email} · <button className="link" onClick={() => supabase().auth.signOut()}>sair</button></span>
      </header>
      <main>
        {aba === "chat" && <Chat conversaId={conversaId} setConversaId={setConversaId} />}
        {aba === "tarefas" && <Tarefas />}
        {aba === "resultados" && <Resultados key={resultadoAberto ?? "r"} abrirId={resultadoAberto} />}
        {aba === "aprovacoes" && <Aprovacoes verResultado={(id) => { setResultadoAberto(id); setAba("resultados"); }} />}
      </main>
    </div>
  );
}
