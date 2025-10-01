import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Trophy, Calendar, DollarSign, Users, MapPin, RefreshCw, Award, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ResultadoLoteria {
  loteria: string;
  concurso: number;
  data: string;
  local: string;
  dezenasOrdemSorteio: string[];
  dezenas: string[];
  trevos: string[];
  timeCoracao: string | null;
  mesSorte: string | null;
  premiacoes: {
    descricao: string;
    faixa: number;
    ganhadores: number;
    valorPremio: number;
  }[];
  estadosPremiados: string[];
  observacao: string;
  acumulou: boolean;
  proximoConcurso: number;
  dataProximoConcurso: string;
  localGanhadores: {
    ganhadores: number;
    municipio: string;
    nomeFatansiaUL: string;
    serie: string;
    posicao: number;
    uf: string;
  }[];
  valorArrecadado: number;
  valorAcumuladoConcurso_0_5: number;
  valorAcumuladoConcursoEspecial: number;
  valorAcumuladoProximoConcurso: number;
  valorEstimadoProximoConcurso: number;
}

interface HistoricoResultado {
  concurso: number;
  data: string;
  dezenas: string[];
  premiacoes: {
    descricao: string;
    ganhadores: number;
    valorPremio: number;
  }[];
  valorArrecadado: number;
}

const Resultados = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [resultadoAtual, setResultadoAtual] = useState<ResultadoLoteria | null>(null);
  const [historicoResultados, setHistoricoResultados] = useState<HistoricoResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [loteriaAtiva, setLoteriaAtiva] = useState<string>('megasena');
  const [loteriasDisponiveis, setLoteriasDisponiveis] = useState<string[]>([]);

  useEffect(() => {
    fetchLoteriasDisponiveis();
    fetchResultadoAtual();
  }, [loteriaAtiva]);

  const fetchLoteriasDisponiveis = async () => {
    try {
      const response = await fetch('https://loteriascaixa-api.herokuapp.com/api');
      const loterias = await response.json();
      setLoteriasDisponiveis(loterias);
    } catch (error) {
      console.error('Erro ao buscar loterias disponíveis:', error);
      setLoteriasDisponiveis(['megasena', 'lotofacil', 'quina', 'lotomania', 'timemania']);
    }
  };

  const fetchResultadoAtual = async () => {
    setLoading(true);
    try {
      // Tenta primeiro a API original do guto-alves
      let response = await fetch(`https://loteriascaixa-api.herokuapp.com/api/${loteriaAtiva}/latest`);
      
      if (!response.ok) {
        // Fallback para API alternativa se a primeira falhar
        response = await fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${loteriaAtiva}/`);
      }
      
      const resultado = await response.json();
      setResultadoAtual(resultado);
    } catch (error) {
      console.error('Erro ao buscar resultado atual:', error);
      
      // Se ambas APIs falharem, mostra dados simulados para demonstração
      setResultadoAtual({
        loteria: loteriaAtiva,
        concurso: 2700,
        data: new Date().toLocaleDateString('pt-BR'),
        local: 'ESPAÇO DA SORTE - SP',
        dezenasOrdemSorteio: ['01', '02', '03', '04', '05', '06'],
        dezenas: ['01', '02', '03', '04', '05', '06'],
        trevos: [],
        timeCoracao: null,
        mesSorte: null,
        premiacoes: [
          {
            descricao: 'Sena',
            faixa: 1,
            ganhadores: 0,
            valorPremio: 50000000
          }
        ],
        estadosPremiados: [],
        observacao: 'Dados de demonstração - API temporariamente indisponível',
        acumulou: true,
        proximoConcurso: 2701,
        dataProximoConcurso: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        localGanhadores: [],
        valorArrecadado: 100000000,
        valorAcumuladoConcurso_0_5: 0,
        valorAcumuladoConcursoEspecial: 0,
        valorAcumuladoProximoConcurso: 60000000,
        valorEstimadoProximoConcurso: 60000000
      });
      
      toast({
        title: "API Temporariamente Indisponível",
        description: "Mostrando dados de demonstração. Tente novamente mais tarde.",
        variant: "default",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricoResultados = async () => {
    setLoadingHistorico(true);
    try {
      // Buscar últimos 10 concursos
      const promises = [];
      if (resultadoAtual) {
        for (let i = 1; i <= 10; i++) {
          const concursoNum = resultadoAtual.concurso - i;
          if (concursoNum > 0) {
            promises.push(
              fetch(`https://loteriascaixa-api.herokuapp.com/api/${loteriaAtiva}/${concursoNum}`)
                .then(res => res.ok ? res.json() : null)
                .catch(() => null)
            );
          }
        }
      }
      
      const resultados = await Promise.all(promises);
      const historicoValido = resultados
        .filter(Boolean)
        .map(resultado => ({
          concurso: resultado.concurso,
          data: resultado.data,
          dezenas: resultado.dezenas,
          premiacoes: resultado.premiacoes,
          valorArrecadado: resultado.valorArrecadado
        }));
      
      setHistoricoResultados(historicoValido);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarNumero = (numero: number) => {
    return new Intl.NumberFormat('pt-BR').format(numero);
  };

  const getLoteriaNome = (loteria: string) => {
    const nomes: Record<string, string> = {
      megasena: 'Mega-Sena',
      lotofacil: 'Lotofácil',
      quina: 'Quina',
      lotomania: 'Lotomania',
      timemania: 'Timemania',
      duplasena: 'Dupla Sena',
      federal: 'Federal',
      diadesorte: 'Dia de Sorte',
      supersete: 'Super Sete',
      maismilionaria: '+Milionária'
    };
    return nomes[loteria] || loteria.charAt(0).toUpperCase() + loteria.slice(1);
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <Skeleton key={j} className="h-8 w-8 rounded-full" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Resultados das Loterias</h1>
          <p className="text-muted-foreground">
            Resultados oficiais da Caixa Econômica Federal
          </p>
        </div>
        <Button
          onClick={fetchResultadoAtual}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Seletor de Loteria */}
      <div className="flex gap-1 flex-wrap">
        {loteriasDisponiveis.map((loteria) => (
          <Button
            key={loteria}
            variant={loteriaAtiva === loteria ? "default" : "outline"}
            size="sm"
            className="h-9 px-3"
            onClick={() => setLoteriaAtiva(loteria)}
          >
            {getLoteriaNome(loteria)}
          </Button>
        ))}
      </div>

      {resultadoAtual && (
        <Tabs defaultValue="atual" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:gap-2">
            <TabsTrigger value="atual">Resultado Atual</TabsTrigger>
            <TabsTrigger value="historico" onClick={fetchHistoricoResultados}>Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="atual" className="space-y-6">
            {/* Card Principal do Resultado */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Trophy className="h-5 w-5" />
                      {getLoteriaNome(resultadoAtual.loteria)}
                    </CardTitle>
                    <CardDescription className="text-base">
                      Concurso #{resultadoAtual.concurso} • {resultadoAtual.data}
                    </CardDescription>
                  </div>
                  <Badge variant={resultadoAtual.acumulou ? "destructive" : "default"} className="text-sm">
                    {resultadoAtual.acumulou ? "Acumulou" : "Sorteado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-5">
                {/* Números Sorteados */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Números Sorteados</h3>
                  <div className="flex gap-2 flex-wrap">
                    {resultadoAtual.dezenas.map((numero, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-base font-semibold"
                      >
                        {numero}
                      </div>
                    ))}
                  </div>
                  {resultadoAtual.timeCoracao && (
                    <div className="mt-3">
                      <p className="text-sm font-medium">Time do Coração:</p>
                      <Badge variant="outline" className="mt-1">
                        {resultadoAtual.timeCoracao}
                      </Badge>
                    </div>
                  )}
                  {resultadoAtual.mesSorte && (
                    <div className="mt-3">
                      <p className="text-sm font-medium">Mês da Sorte:</p>
                      <Badge variant="outline" className="mt-1">
                        {resultadoAtual.mesSorte}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Informações do Sorteio */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Local do Sorteio</p>
                      <p className="font-medium text-sm">{resultadoAtual.local}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor Arrecadado</p>
                      <p className="font-medium text-sm">{formatarValor(resultadoAtual.valorArrecadado)}</p>
                    </div>
                  </div>
                </div>

                {/* Premiações */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Premiações</h3>
                  <div className="space-y-2">
                    {resultadoAtual.premiacoes.map((premiacao, index) => (
                      <div key={index} className="rounded-lg border px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{premiacao.descricao}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatarNumero(premiacao.ganhadores)} ganhador{premiacao.ganhadores !== 1 ? 'es' : ''}
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold text-sm sm:text-base">
                          {formatarValor(premiacao.valorPremio)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Locais dos Ganhadores */}
                {resultadoAtual.localGanhadores.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Locais dos Ganhadores Principais</h3>
                    <div className="grid gap-2">
                      {resultadoAtual.localGanhadores.map((local, index) => (
                        <div key={index} className="flex justify-between items-center rounded-lg border px-3 py-2">
                          <div>
                            <p className="font-medium text-sm">{local.municipio} - {local.uf}</p>
                            {local.nomeFatansiaUL && (
                              <p className="text-xs text-muted-foreground">{local.nomeFatansiaUL}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {formatarNumero(local.ganhadores)} ganhador{local.ganhadores !== 1 ? 'es' : ''}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Próximo Concurso */}
                <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">Próximo Concurso</h3>
                    <p className="text-sm text-muted-foreground">
                      Concurso #{resultadoAtual.proximoConcurso} • {resultadoAtual.dataProximoConcurso}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    <span className="block">Estimativa</span>
                    <span className="text-xl font-bold text-primary">
                      {formatarValor(resultadoAtual.valorEstimadoProximoConcurso)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            {loadingHistorico ? (
              <LoadingSkeleton />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Histórico dos Últimos Concursos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concurso</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Dezenas</TableHead>
                        <TableHead>Ganhadores (Sena)</TableHead>
                        <TableHead className="text-right">Valor Arrecadado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicoResultados.map((resultado) => (
                        <TableRow key={resultado.concurso}>
                          <TableCell className="font-medium">#{resultado.concurso}</TableCell>
                          <TableCell>{resultado.data}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {resultado.dezenas.map((numero, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {numero}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {resultado.premiacoes[0] ? formatarNumero(resultado.premiacoes[0].ganhadores) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatarValor(resultado.valorArrecadado)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {historicoResultados.length === 0 && (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Clique em "Histórico" para carregar os últimos resultados
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!resultadoAtual && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
            <p className="text-muted-foreground">
              Não foi possível carregar os resultados. Tente novamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Resultados;