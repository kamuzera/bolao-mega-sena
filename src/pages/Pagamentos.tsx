import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Eye, RefreshCw, Trash2, Plus, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface Pagamento {
  id: string;
  user_id: string;
  concurso_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  quantidade_cotas: number;
  valor_total: number;
  status: string;
  forma_pagamento: string;
  created_at: string;
  updated_at: string;
  profile?: {
    nome: string;
    email: string;
  };
  concurso?: {
    nome: string;
    numero: number;
    status: string;
    valor_cota: number;
  };
}

export default function Pagamentos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [stripeConfigOpen, setStripeConfigOpen] = useState(false);
  const [stripeConfig, setStripeConfig] = useState({
    publishableKey: '',
    secretKey: ''
  });

  const fetchStripeConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_admin')
        .select('stripe_publishable_key, stripe_secret_key')
        .single();

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        return;
      }

      if (data) {
        setStripeConfig({
          publishableKey: data.stripe_publishable_key || '',
          secretKey: data.stripe_secret_key || ''
        });
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleSaveStripeConfig = async () => {
    try {
      const { error } = await supabase
        .from('configuracoes_admin')
        .update({
          stripe_publishable_key: stripeConfig.publishableKey,
          stripe_secret_key: stripeConfig.secretKey
        })
        .eq('id', (await supabase.from('configuracoes_admin').select('id').single()).data?.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "As configurações do Stripe foram salvas com sucesso",
      });
      setStripeConfigOpen(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações do Stripe",
        variant: "destructive"
      });
    }
  };

  const fetchPagamentos = async () => {
    try {
      setLoading(true);
      
      console.log('Profile:', profile);
      
      // Wait for profile to be loaded
      if (!profile && profile !== null) {
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('pagamentos')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin, only show user's own payments
      if (profile?.tipo !== 'admin' && profile?.user_id) {
        query = query.eq('user_id', profile.user_id);
        console.log('Filtering by user_id:', profile.user_id);
      } else {
        console.log('Admin user - showing all payments');
      }

      const { data: pagamentos, error } = await query;

      console.log('Query result:', { pagamentos, error, count: pagamentos?.length });

      if (error) {
        console.error('Erro ao buscar pagamentos:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os pagamentos",
          variant: "destructive"
        });
        return;
      }

      // Fetch related data separately
      if (pagamentos && pagamentos.length > 0) {
        const userIds = [...new Set(pagamentos.map(p => p.user_id))];
        const concursoIds = [...new Set(pagamentos.map(p => p.concurso_id))];

        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nome, email')
          .in('user_id', userIds);

        // Fetch concursos
        const { data: concursos } = await supabase
          .from('concursos')
          .select('id, nome, numero, status, valor_cota')
          .in('id', concursoIds);

        // Combine data
        const pagamentosWithData = pagamentos.map(pagamento => ({
          ...pagamento,
          profile: profiles?.find(p => p.user_id === pagamento.user_id),
          concurso: concursos?.find(c => c.id === pagamento.concurso_id)
        }));

        setPagamentos(pagamentosWithData);
      } else {
        setPagamentos([]);
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'bg-green-500';
      case 'pendente':
        return 'bg-yellow-500';
      case 'cancelado':
        return 'bg-red-500';
      case 'expirado':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      case 'expirado':
        return 'Expirado';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleVerifyPayment = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Pagamento verificado",
        description: `Status: ${data.paymentStatus}`,
      });

      // Refresh the payments list
      fetchPagamentos();
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o pagamento",
        variant: "destructive"
      });
    }
  };


  const handleDeletePayment = async (pagamentoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pagamentos')
        .delete()
        .eq('id', pagamentoId);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Pagamento excluído com sucesso",
      });

      fetchPagamentos();
    } catch (error) {
      console.error('Erro ao excluir pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o pagamento",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPagamentos();
  }, [profile]);

  useEffect(() => {
    if (stripeConfigOpen) {
      fetchStripeConfig();
    }
  }, [stripeConfigOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando pagamentos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {profile?.tipo === 'admin' ? 'Gerenciar Pagamentos' : 'Meus Pagamentos'}
          </h1>
          <p className="text-muted-foreground">
            {profile?.tipo === 'admin' 
              ? 'Visualize e gerencie todos os pagamentos do sistema'
              : 'Acompanhe o status dos seus pagamentos'
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          {profile?.tipo === 'admin' && (
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Tabela
              </Button>
            </div>
          )}
          
          <Button onClick={fetchPagamentos} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          
          {profile?.tipo === 'admin' && (
            <Dialog open={stripeConfigOpen} onOpenChange={setStripeConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Stripe
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Configurações do Stripe</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="publishable-key">Chave Pública</Label>
                    <Input
                      id="publishable-key"
                      placeholder="pk_test_..."
                      value={stripeConfig.publishableKey}
                      onChange={(e) => setStripeConfig(prev => ({ ...prev, publishableKey: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="secret-key">Chave Secreta</Label>
                    <Input
                      id="secret-key"
                      placeholder="sk_test_..."
                      value={stripeConfig.secretKey}
                      onChange={(e) => setStripeConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                    />
                  </div>
                  <Button 
                    onClick={handleSaveStripeConfig}
                    className="w-full"
                  >
                    Salvar Configurações
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {viewMode === 'table' ? (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {profile?.tipo === 'admin' && <TableHead>Usuário</TableHead>}
                  <TableHead>Concurso</TableHead>
                  <TableHead>Cotas</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Forma Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((pagamento) => (
                  <TableRow key={pagamento.id}>
                    {profile?.tipo === 'admin' && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{pagamento.profile?.nome || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{pagamento.profile?.email || 'N/A'}</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div>
                        <div className="font-medium">{pagamento.concurso?.nome || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">Nº {pagamento.concurso?.numero || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{pagamento.quantidade_cotas}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {pagamento.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {pagamento.forma_pagamento}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(pagamento.status)}>
                        {getStatusText(pagamento.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(pagamento.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {pagamento.stripe_checkout_session_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyPayment(pagamento.stripe_checkout_session_id!)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        {profile?.tipo === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePayment(pagamento.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {pagamentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={profile?.tipo === 'admin' ? 8 : 7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <CreditCard className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pagamentos.map((pagamento) => (
            <Card key={pagamento.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      {pagamento.concurso?.nome || 'N/A'}
                    </CardTitle>
                    <CardDescription>
                      Nº {pagamento.concurso?.numero || 'N/A'}
                    </CardDescription>
                    {profile?.tipo === 'admin' && pagamento.profile && (
                      <p className="text-sm text-muted-foreground">
                        {pagamento.profile.nome}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(pagamento.status)}>
                    {getStatusText(pagamento.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Informações principais */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">{formatDate(pagamento.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium">R$ {pagamento.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  
                  {/* Informações do pagamento */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cotas:</span>
                      <span className="font-medium">{pagamento.quantidade_cotas}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Forma de pagamento:</span>
                      <Badge variant="outline" className="capitalize">
                        {pagamento.forma_pagamento}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {pagamento.stripe_checkout_session_id && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleVerifyPayment(pagamento.stripe_checkout_session_id!)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    )}
                    
                    {profile?.tipo === 'admin' && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeletePayment(pagamento.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagamentos.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pagamento encontrado</h3>
            <p className="text-muted-foreground">
              {profile?.tipo === 'admin'
                ? 'Nenhum pagamento foi registrado ainda.'
                : 'Participe de um concurso para ver seus pagamentos aqui!'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}