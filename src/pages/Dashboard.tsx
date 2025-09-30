import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, DollarSign, BarChart3, TrendingUp, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalConcursos: number;
  concursosAtivos: number;
  totalParticipacoes: number;
  valorTotal: number;
  totalUsuarios?: number;
  comissaoAdmin?: number;
  totalParaSerJogado?: number;
}

interface TrendingContest {
  id: string;
  nome: string;
  numero: number;
  cotas_vendidas: number;
  max_cotas: number;
  premio_total: number;
  receitaSemAdmin?: number;
  totalCotasVendidas?: number;
  totalParaSerJogado?: number;
}

interface VendasPorConcurso {
  nome: string;
  vendas: number;
  receita: number;
}

interface StatusConcurso {
  status: string;
  quantidade: number;
  cor: string;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalConcursos: 0,
    concursosAtivos: 0,
    totalParticipacoes: 0,
    valorTotal: 0,
  });
  const [trendingContests, setTrendingContests] = useState<TrendingContest[]>([]);
  const [vendasPorConcurso, setVendasPorConcurso] = useState<VendasPorConcurso[]>([]);
  const [statusConcursos, setStatusConcursos] = useState<StatusConcurso[]>([]);
  const [loading, setLoading] = useState(true);

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('pt-BR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchTrendingContests();
    fetchVendasPorConcurso();
    fetchStatusConcursos();
  }, []);

  const fetchTrendingContests = async () => {
    try {
      const { data: concursos } = await supabase
        .from('concursos')
        .select('id, nome, numero, cotas_vendidas, max_cotas, premio_total, status, valor_cota')
        .eq('status', 'aberto')
        .order('cotas_vendidas', { ascending: false })
        .limit(3);

      if (concursos) {
        // Calcular valores corretos para cada concurso
        const concursosComValores = await Promise.all(concursos.map(async (concurso) => {
          // Buscar participações do concurso
          const { data: participacoes } = await supabase
            .from('participacoes')
            .select('valor_total, quantidade_cotas, user_id')
            .eq('concurso_id', concurso.id);

          // Separar participações do admin
          const participacoesOutrosUsuarios = participacoes?.filter(p => p.user_id !== profile?.user_id) || [];
          
          // Calcular valores
          const receitaSemAdmin = participacoesOutrosUsuarios.reduce((sum, p) => sum + Number(p.valor_total), 0);
          const totalCotasVendidas = participacoesOutrosUsuarios.reduce((sum, p) => sum + Number(p.quantidade_cotas), 0);
          
          // Buscar configurações admin
          const { data: configAdmin } = await supabase
            .from('configuracoes_admin')
            .select('percentual_comissao, cotas_gratuitas')
            .single();
          
          const cotasDoAdmin = (configAdmin?.cotas_gratuitas || 3) * concurso.valor_cota;
          const comissaoAdmin = receitaSemAdmin * ((configAdmin?.percentual_comissao || 10) / 100);
          const totalParaSerJogado = receitaSemAdmin - cotasDoAdmin - comissaoAdmin;
          
          return {
            ...concurso,
            receitaSemAdmin,
            totalCotasVendidas,
            totalParaSerJogado
          };
        }));

        setTrendingContests(concursosComValores);
      }
    } catch (error) {
      console.error('Erro ao buscar concursos em tendência:', error);
    }
  };

  const fetchVendasPorConcurso = async () => {
    try {
      const { data: concursos } = await supabase
        .from('concursos')
        .select('nome, cotas_vendidas, premio_total')
        .order('cotas_vendidas', { ascending: false })
        .limit(5);

      if (concursos) {
        const vendasData = concursos.map(concurso => ({
          nome: concurso.nome,
          vendas: concurso.cotas_vendidas,
          receita: concurso.premio_total * concurso.cotas_vendidas
        }));
        setVendasPorConcurso(vendasData);
      }
    } catch (error) {
      console.error('Erro ao buscar vendas por concurso:', error);
    }
  };

  const fetchStatusConcursos = async () => {
    try {
      const { data: concursos } = await supabase
        .from('concursos')
        .select('status');

      if (concursos) {
        const statusCount = concursos.reduce((acc: any, concurso) => {
          acc[concurso.status] = (acc[concurso.status] || 0) + 1;
          return acc;
        }, {});

        const cores = {
          'aberto': '#10b981',
          'fechado': '#ef4444',
          'finalizado': '#6b7280',
          'cancelado': '#f59e0b'
        };

        const statusData = Object.entries(statusCount).map(([status, quantidade]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          quantidade: quantidade as number,
          cor: cores[status as keyof typeof cores] || '#6b7280'
        }));

        setStatusConcursos(statusData);
      }
    } catch (error) {
      console.error('Erro ao buscar status dos concursos:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Buscar estatísticas dos concursos
      const { data: concursos } = await supabase
        .from('concursos')
        .select('status, premio_total');

      // Buscar participações do usuário ou todas (se admin)  
      let participacoesQuery = supabase.from('participacoes').select('valor_total, quantidade_cotas, user_id');
      
      if (profile?.tipo !== 'admin' && profile?.user_id) {
        participacoesQuery = participacoesQuery.eq('user_id', profile.user_id);
      }

      const { data: participacoes, error: participacoesError } = await participacoesQuery;

      // Se for admin, calcular estatísticas completas
      let totalUsuariosAtivos = 0;
      let comissaoAdmin = 0;
      let receitaTotalArrecadada = 0;
      let valorCotasAdmin = 0;
      let totalParaJogar = 0;
      
      if (profile?.tipo === 'admin') {
        // Separar participações do admin das dos outros usuários
        const participacoesAdmin = participacoes?.filter(p => p.user_id === profile.user_id) || [];
        const participacoesOutrosUsuarios = participacoes?.filter(p => p.user_id !== profile.user_id) || [];
        
        const usuariosUnicos = new Set(participacoesOutrosUsuarios.map(p => p.user_id));
        totalUsuariosAtivos = usuariosUnicos.size;

        // Buscar configurações admin
        const { data: configAdmin } = await supabase
          .from('configuracoes_admin')
          .select('percentual_comissao, cotas_gratuitas')
          .single();

        if (configAdmin && participacoes) {
          // RECEITA SEM ADMIN = soma apenas das participações de outros usuários (valor realmente arrecadado)
          const receitaSemAdmin = participacoesOutrosUsuarios.reduce((sum, p) => sum + Number(p.valor_total), 0);
          
          // RECEITA TOTAL = receita sem admin (para exibição)
          receitaTotalArrecadada = receitaSemAdmin;
          
          // COTAS DO ADM = quantidade de cotas gratuitas * valor da cota (valor fixo)
          // Calcular por concurso ativo
          const { data: concursosAtivos } = await supabase
            .from('concursos')
            .select('id, valor_cota')
            .eq('status', 'aberto');
          
          // Só calcular cotas do admin se houver concursos ativos E receita
          if (concursosAtivos && concursosAtivos.length > 0 && receitaSemAdmin > 0) {
            const valorCota = concursosAtivos[0]?.valor_cota || 0;
            valorCotasAdmin = configAdmin.cotas_gratuitas * valorCota * concursosAtivos.length;
          } else {
            valorCotasAdmin = 0; // Sem receita = sem cotas do admin
          }
          
          // COMISSÃO = percentual sobre a RECEITA SEM ADMIN (só se houver receita)
          comissaoAdmin = receitaSemAdmin > 0 ? receitaSemAdmin * (configAdmin.percentual_comissao / 100) : 0;
          
          // TOTAL PARA SER JOGADO = receita sem admin - cotas do admin - comissão
          totalParaJogar = receitaSemAdmin - valorCotasAdmin - comissaoAdmin;
          
          
          
        }
      }

      const totalConcursos = concursos?.length || 0;
      const concursosAtivos = concursos?.filter(c => c.status === 'aberto').length || 0;
      // Somar a quantidade de cotas, não o número de participações (excluindo admin)
      const participacoesOutrosUsuarios = participacoes?.filter(p => p.user_id !== profile?.user_id) || [];
      const totalCotasVendidas = participacoesOutrosUsuarios?.reduce((sum, p) => sum + Number(p.quantidade_cotas), 0) || 0;
      const valorTotal = participacoes?.reduce((sum, p) => sum + Number(p.valor_total), 0) || 0;
      

      setStats({
        totalConcursos,
        concursosAtivos,
        totalParticipacoes: totalCotasVendidas,
        valorTotal: profile?.tipo === 'admin' ? receitaTotalArrecadada : valorTotal,
        totalUsuarios: totalUsuariosAtivos,
        comissaoAdmin: comissaoAdmin,
        totalParaSerJogado: totalParaJogar,
      });
      
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const DashboardStatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    variant = "default" 
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    variant?: "default" | "secondary";
  }) => (
    <Card className="bg-dashboard-gradient border-dashboard-card-border shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Seus insights de loteria para {getCurrentDate()}
          </p>
          <Badge variant="outline" className="mt-3 capitalize bg-primary/10 text-primary border-primary/20">
            {profile?.tipo}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <DashboardStatCard
            title={profile?.tipo === 'admin' ? "Total Arrecadado" : "Valor Investido"}
            value={`R$ ${stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            description={profile?.tipo === 'admin' ? "Receita total com vendas" : "Investido em cotas"}
            icon={DollarSign}
          />
          
          <DashboardStatCard
            title="Cotas Vendidas"
            value={stats.totalParticipacoes}
            description="Total de cotas comercializadas"
            icon={FileText}
          />
          
          <DashboardStatCard
            title="Participantes Ativos"
            value={profile?.tipo === 'admin' ? (stats.totalUsuarios || 0) : stats.totalParticipacoes}
            description={profile?.tipo === 'admin' ? "Usuários com participações ativas" : "Suas participações ativas"}
            icon={Users}
          />
          
          {profile?.tipo === 'admin' && (
            <DashboardStatCard
              title="Comissão do Admin"
              value={`R$ ${(stats.comissaoAdmin || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              description="Comissão sobre valor total arrecadado"
              icon={DollarSign}
            />
          )}
          
          <DashboardStatCard
            title={profile?.tipo === 'admin' ? "Total para Ser Jogado" : "Concursos Ativos"}
            value={profile?.tipo === 'admin' ? `R$ ${(stats.totalParaSerJogado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : stats.concursosAtivos}
            description={profile?.tipo === 'admin' ? "Total arrecadado - Cotas do admin - Comissão" : "Abertos para participação"}
            icon={Trophy}
          />
        </div>

        {/* Concursos Ativos Section */}
        {trendingContests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Concursos Ativos</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {trendingContests.map((contest) => (
                <Card key={contest.id} className="p-4">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-foreground">{contest.nome}</h3>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        Ativo
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Concurso:</span>
                        <span className="font-medium">#{contest.numero}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cotas Vendidas:</span>
                        <span className="font-medium">{contest.totalCotasVendidas || 0}/{contest.max_cotas}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Arrecadado:</span>
                        <span className="font-medium text-green-600">
                          R$ {(contest.receitaSemAdmin || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Para Jogar:</span>
                        <span className="font-medium text-primary">
                          R$ {(contest.totalParaSerJogado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prêmio:</span>
                        <span className="font-medium">
                          R$ {contest.premio_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-dashboard-gradient border-dashboard-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Vendas por Concurso
              </CardTitle>
              <CardDescription>
                Análise de performance dos concursos ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendasPorConcurso.length > 0 ? (
                <ChartContainer
                  config={{
                    vendas: {
                      label: "Vendas",
                      color: "hsl(var(--primary))",
                    },
                    receita: {
                      label: "Receita (R$)",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={vendasPorConcurso}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="nome" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="vendas" fill="var(--color-vendas)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-dashboard-gradient border-dashboard-card-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" />
                Status dos Concursos
              </CardTitle>
              <CardDescription>
                Resumo do status atual dos concursos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusConcursos.length > 0 ? (
                <ChartContainer
                  config={{
                    quantidade: {
                      label: "Quantidade",
                    },
                  }}
                  className="h-[300px]"
                >
                  <PieChart>
                    <Pie
                      data={statusConcursos}
                      dataKey="quantidade"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ status, quantidade }) => `${status}: ${quantidade}`}
                    >
                      {statusConcursos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;