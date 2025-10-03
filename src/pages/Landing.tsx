import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight, ShieldCheck, Trophy, Users, Zap, Quote, Crown } from 'lucide-react';

interface PublicConcurso {
  id: string;
  nome: string;
  numero: number;
  data_sorteio: string;
  valor_cota: number;
  max_cotas: number;
  descricao?: string | null;
}

const testimonials = [
  {
    nome: 'Carla Mendes',
    papel: 'Campeã do Bolão 154',
    depoimento:
      'Já participei de vários bolões por aí, mas nunca me senti tão segura quanto aqui. Além de transparente, a plataforma me avisa de tudo pelo WhatsApp!',
    destaque: 'R$ 32.500 em prêmios distribuídos',
  },
  {
    nome: 'Felipe Duarte',
    papel: 'Participante recorrente',
    depoimento:
      'Adoro a forma como os números são organizados e como fica fácil acompanhar meus jogos. É só entrar, escolher e torcer!',
    destaque: 'Mais de 20 concursos disputados',
  },
  {
    nome: 'Aline Brito',
    papel: 'Ganhadora do Concurso Especial',
    depoimento:
      'Entrei por indicação e em menos de três concursos já estava comemorando com a família. Recomendo demais para quem quer aumentar as chances.',
    destaque: 'Bolão especial com 80 cotas vendidas',
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [concursos, setConcursos] = useState<PublicConcurso[]>([]);
  const [loadingConcursos, setLoadingConcursos] = useState(true);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchConcursosPublicos = async () => {
      try {
        setLoadingConcursos(true);
        const { data } = await supabase
          .from('concursos')
          .select('id, nome, numero, data_sorteio, valor_cota, max_cotas, descricao')
          .order('data_sorteio', { ascending: true })
          .limit(6);

        setConcursos(data || []);
      } catch (error) {
        console.error('Erro ao carregar concursos públicos:', error);
      } finally {
        setLoadingConcursos(false);
      }
    };

    fetchConcursosPublicos();
  }, []);

  const handleNavigateToAuth = () => navigate('/auth');

  const concursosDisponiveis = useMemo(() => concursos.slice(0, 3), [concursos]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-wide text-primary">
                Bodes da Mega-Sena
              </span>
              <p className="text-xs text-muted-foreground">Bolões oficiais com gestão transparente</p>
            </div>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <button onClick={() => navigate('/concursos')} className="transition hover:text-primary">
              Bolões
            </button>
            <button onClick={() => navigate('/resultados')} className="transition hover:text-primary">
              Loterias
            </button>
            <button className="transition hover:text-primary" onClick={() => navigate('/noticias')}>
              Notícias
            </button>
            <button
              className="transition hover:text-primary"
              onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Como Funciona
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden text-slate-300 hover:text-primary md:inline-flex" onClick={handleNavigateToAuth}>
              Entrar
            </Button>
            <Button onClick={handleNavigateToAuth} className="bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              Criar conta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[3fr,2fr] lg:items-center">
          <div>
            <Badge className="bg-primary/10 text-primary">Bolão Oficial</Badge>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
              Participe do próximo bolão e aumente suas chances de ganhar!
            </h1>
            <p className="mt-4 max-w-xl text-lg text-slate-300">
              Junte-se aos Bodes da Mega-Sena e entre em bolões organizados com estratégia, transparência e acompanhamento em tempo real.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" className="bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/90" onClick={handleNavigateToAuth}>
                Criar minha conta agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" onClick={() => document.getElementById('concursos')?.scrollIntoView({ behavior: 'smooth' })}>
                Ver concursos disponíveis
              </Button>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <FeatureCard icon={ShieldCheck} title="Gestão transparente" description="Registros de participação, pagamentos e resultados em um só lugar." />
              <FeatureCard icon={Zap} title="Acompanhamento em tempo real" description="Receba notificações imediatas e acompanhe cada quota vendida." />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -left-10 top-10 hidden h-40 w-40 rounded-full bg-primary/20 blur-3xl md:block" />
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/50 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Último prêmio distribuído</span>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-300">
                  Mega Bolão
                </Badge>
              </div>
              <p className="mt-6 text-4xl font-bold text-emerald-300">R$ 312.870,00</p>
              <p className="mt-2 text-sm text-slate-400">Entre para disputar a próxima bolada com a equipe dos Bodes.</p>
              <div className="mt-6 space-y-4">
                <Statistic label="Participantes ativos" value="4.280" />
                <Statistic label="Concursos realizados" value="162" />
                <Statistic label="Taxa de premiação" value="32%" />
              </div>
            </div>
          </div>
        </section>

        {/* Concursos */}
        <section id="concursos" className="border-y border-slate-800/60 bg-slate-950/70 py-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge className="bg-blue-500/10 text-blue-300">Concursos em destaque</Badge>
                <h2 className="mt-4 text-3xl font-semibold text-slate-100">Escolha o bolão ideal para você</h2>
                <p className="mt-2 max-w-3xl text-base text-slate-400">
                  Visualize os concursos disponíveis. Para reservar suas cotas e participar das apostas coletivas, é necessário criar sua conta gratuita.
                </p>
              </div>
              <Button size="lg" className="bg-primary/80 hover:bg-primary" onClick={handleNavigateToAuth}>
                Crie sua conta para participar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {loadingConcursos ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={`skeleton-${idx}`} className="h-48 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/60" />
                ))
              ) : concursosDisponiveis.length > 0 ? (
                concursosDisponiveis.map((concurso) => (
                  <article key={concurso.id} className="group flex h-full flex-col justify-between rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-xl transition hover:border-primary/60 hover:bg-slate-900">
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                          Concurso #{concurso.numero}
                        </Badge>
                        <Calendar className="h-4 w-4 text-slate-500" />
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-slate-100">{concurso.nome}</h3>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-400">{concurso.descricao || 'Bolão estratégico organizado pela equipe Bodes para maximizar suas chances de acerto.'}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Valor por cota</p>
                        <p className="text-lg font-semibold text-emerald-300">
                          R$ {concurso.valor_cota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:border-primary/60 hover:text-primary" onClick={handleNavigateToAuth}>
                        Participar
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full rounded-2xl border border-slate-800/70 bg-slate-900/60 p-8 text-center text-slate-400">
                  Nenhum concurso público disponível no momento. Cadastre-se para receber notificações dos próximos bolões.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <Badge className="bg-emerald-500/10 text-emerald-300">Como Funciona</Badge>
              <h2 className="mt-4 text-3xl font-semibold text-slate-100">Processo simples, experiência completa</h2>
              <p className="mt-4 text-slate-400">
                Criamos o fluxo ideal para você participar sem complicação. Transparência nos pagamentos, sorteios acompanhados em tempo real e suporte dedicado para cada participante.
              </p>
              <ul className="mt-6 space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <Crown className="mt-1 h-4 w-4 text-primary" />
                  Escolha o concurso que combina com você, com estratégias elaboradas pela nossa equipe.
                </li>
                <li className="flex items-start gap-3">
                  <Users className="mt-1 h-4 w-4 text-primary" />
                  Reserve suas cotas e acompanhe quem está dentro do seu bolão em tempo real pelo painel.
                </li>
                <li className="flex items-start gap-3">
                  <Trophy className="mt-1 h-4 w-4 text-primary" />
                  Receba o resultado oficial em minutos e participe da divisão dos prêmios com transparência.
                </li>
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={handleNavigateToAuth} className="bg-primary text-primary-foreground">
                  Quero participar agora
                </Button>
                <Button variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:border-primary/60 hover:text-primary" onClick={() => navigate('/resultados')}>
                  Ver resultados anteriores
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-primary/10 blur-3xl" />
              <div className="relative space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
                <StepCard step="01" title="Crie sua conta gratuita" description="Cadastre-se com e-mail e telefone. Segurança garantida com autenticação Supabase." />
                <StepCard step="02" title="Escolha seu bolão" description="Visualize cotas disponíveis, números sugeridos e histórico de prêmios." />
                <StepCard step="03" title="Jogada confirmada" description="Receba notificações e acompanhe resultados em tempo real com nossa equipe." />
              </div>
            </div>
          </div>
        </section>

        {/* Testemunhos */}
        <section className="border-t border-slate-800/60 bg-slate-950/60 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Badge className="bg-purple-500/10 text-purple-300">Histórias reais</Badge>
                <h2 className="mt-3 text-3xl font-semibold text-slate-100">Confiança de quem já ganhou com os Bodes</h2>
                <p className="mt-2 max-w-3xl text-base text-slate-400">
                  Depoimentos de participantes que já levaram prêmios e continuam com a gente a cada novo concurso.
                </p>
              </div>
              <Button variant="outline" className="border-slate-700 text-slate-200 hover:border-primary/60 hover:text-primary" onClick={handleNavigateToAuth}>
                Faça parte dessa história
              </Button>
            </header>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {testimonials.map((item) => (
                <article key={item.nome} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-lg">
                  <Quote className="h-6 w-6 text-primary" />
                  <p className="mt-4 text-sm text-slate-300">“{item.depoimento}”</p>
                  <div className="mt-6">
                    <p className="text-base font-semibold text-slate-100">{item.nome}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{item.papel}</p>
                    <p className="mt-2 text-xs text-emerald-300">{item.destaque}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-blue-600/20 to-indigo-700/10 p-10 shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <Badge className="bg-black/40 text-primary-foreground">Convite exclusivo</Badge>
              <h2 className="mt-4 text-3xl font-semibold text-slate-100">Garanta sua vaga no próximo bolão dos Bodes!</h2>
              <p className="mt-3 text-base text-slate-200">
                Cadastre-se agora e receba alertas personalizados, números sugeridos e vagas prioritárias nos concursos especiais.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Button size="lg" className="bg-primary text-primary-foreground" onClick={handleNavigateToAuth}>
                  Quero ser participante
                </Button>
                <Button variant="ghost" className="text-slate-200 hover:text-primary" onClick={() => navigate('/auth')}>
                  Entrar com minha conta
                </Button>
              </div>
            </div>
            <div className="absolute -right-6 -top-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/60 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200">Bodes da Mega-Sena © {new Date().getFullYear()}</p>
            <p className="text-xs text-slate-500">Gestão de concursos e bolões com transparência e tecnologia.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <button className="hover:text-primary" onClick={() => navigate('/politica-privacidade')}>
              Política de privacidade
            </button>
            <button className="hover:text-primary" onClick={() => navigate('/termos-uso')}>
              Termos de uso
            </button>
            <button className="hover:text-primary" onClick={() => navigate('/contato')}>
              Contato
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => (
  <div className="flex gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  </div>
);

interface StatisticProps {
  label: string;
  value: string;
}

const Statistic: React.FC<StatisticProps> = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-900/70 px-4 py-3">
    <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
    <span className="text-base font-semibold text-slate-100">{value}</span>
  </div>
);

interface StepCardProps {
  step: string;
  title: string;
  description: string;
}

const StepCard: React.FC<StepCardProps> = ({ step, title, description }) => (
  <div className="relative rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
    <span className="absolute -top-3 left-5 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-xs font-semibold text-primary/90">
      Passo {step}
    </span>
    <h3 className="mt-4 text-lg font-semibold text-slate-100">{title}</h3>
    <p className="mt-2 text-sm text-slate-400">{description}</p>
  </div>
);

export default Landing;
