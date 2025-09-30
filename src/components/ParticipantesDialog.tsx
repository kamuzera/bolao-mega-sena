import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, User, Percent, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Concurso {
  id: string;
  nome: string;
  numero: number;
  premio_total: number;
  valor_cota: number;
}

interface Participante {
  id: string;
  user_id: string;
  numeros_escolhidos: number[];
  quantidade_cotas: number;
  valor_total: number;
  data_participacao: string;
  profiles?: {
    nome: string;
    email: string;
  } | null;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface ParticipantesDialogProps {
  concurso: Concurso;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ParticipantesDialog: React.FC<ParticipantesDialogProps> = ({
  concurso,
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingParticipante, setEditingParticipante] = useState<Participante | null>(null);
  const [prizeDistribution, setPrizeDistribution] = useState({
    participantes: [] as any[],
    totalParaSerJogado: 0,
    totalCotasComAdmin: 0
  });
  const [formData, setFormData] = useState({
    user_id: '',
    numeros_escolhidos: '',
    quantidade_cotas: '1'
  });

  useEffect(() => {
    if (open) {
      fetchParticipantes();
      fetchUsuarios();
    }
  }, [open, concurso.id]);

  useEffect(() => {
    updatePrizeDistribution();
  }, [participantes, concurso.valor_cota]);

  const fetchParticipantes = async () => {
    setLoading(true);
    try {
      // First get participacoes
      const { data: participacoesData, error: participacoesError } = await supabase
        .from('participacoes')
        .select('*')
        .eq('concurso_id', concurso.id)
        .order('data_participacao', { ascending: false });

      if (participacoesError) throw participacoesError;

      // Then get profiles for each user_id
      const userIds = participacoesData?.map(p => p.user_id) || [];
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, nome, email')
          .in('user_id', userIds);

        if (!profilesError) {
          profilesData = profiles || [];
        }
      }

      // Combine the data
      const participantesWithProfiles = participacoesData?.map(participacao => ({
        ...participacao,
        profiles: profilesData.find(profile => profile.user_id === participacao.user_id) || null
      })) || [];

      setParticipantes(participantesWithProfiles);
    } catch (error) {
      console.error('Erro ao buscar participantes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar participantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, email, user_id')
        .eq('ativo', true);

      if (error) throw error;
      setUsuarios(data?.map(u => ({ id: u.user_id, nome: u.nome, email: u.email })) || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  };

  const updatePrizeDistribution = async () => {
    if (participantes.length === 0) return;
    
    try {
      // Separar participações do admin das dos outros usuários
      const participacoesAdmin = participantes.filter(p => p.user_id === profile?.user_id);
      const participacoesOutrosUsuarios = participantes.filter(p => p.user_id !== profile?.user_id);
      
      // Calcular total de cotas (incluindo admin para cálculo do prêmio)
      const totalCotasComAdmin = participantes.reduce((sum, p) => sum + p.quantidade_cotas, 0);
      
      // Calcular total arrecadado (soma apenas das cotas pagas pelos outros participantes, excluindo admin)
      const totalArrecadado = participacoesOutrosUsuarios.reduce((sum, p) => sum + p.quantidade_cotas * concurso.valor_cota, 0);
      
      // Buscar configurações do admin para obter o percentual correto
      const { data: configAdmin } = await supabase
        .from('configuracoes_admin')
        .select('percentual_comissao, cotas_gratuitas')
        .single();
      
      const percentualComissao = configAdmin?.percentual_comissao || 10;
      const cotasGratuitas = configAdmin?.cotas_gratuitas || 3;
      
      // Calcular cotas do admin (quantidade de cotas gratuitas × valor da cota)
      const cotasDoAdmin = cotasGratuitas * concurso.valor_cota;
      
      // Calcular comissão do admin (percentual sobre o total arrecadado ANTES dos descontos)
      const comissaoAdmin = totalArrecadado * (percentualComissao / 100);
      
      // Calcular o total para ser jogado: Total Arrecadado - Cotas do Admin - Comissão do Admin
      const totalParaSerJogado = totalArrecadado - cotasDoAdmin - comissaoAdmin;
      
      
      const distribuicao = {
        participantes: participantes.map(participante => {
          const isAdmin = participante.user_id === profile?.user_id;
          
          // Para cálculo do prêmio, incluir todas as cotas (admin participa normalmente)
          const percentage = totalCotasComAdmin > 0 ? (participante.quantidade_cotas / totalCotasComAdmin) * 100 : 0;
          const prizeAmount = (percentage / 100) * totalParaSerJogado;
          
          return {
            ...participante,
            percentage,
            prizeAmount,
            isAdmin,
            // Para exibição: admin mostra valor das cotas, mas valor_total no banco continua 0
            valor_total_display: isAdmin ? participante.quantidade_cotas * concurso.valor_cota : participante.valor_total
          };
        }),
        totalParaSerJogado,
        totalCotasComAdmin
      };
      
      setPrizeDistribution(distribuicao);
    } catch (error) {
      console.error('Erro ao calcular distribuição de prêmios:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const numerosArray = formData.numeros_escolhidos
        .split(',')
        .map(n => parseInt(n.trim()))
        .filter(n => !isNaN(n) && n >= 1 && n <= 60);

      if (numerosArray.length !== 6) {
        toast({
          title: "Erro",
          description: "Você deve escolher exatamente 6 números entre 1 e 60",
          variant: "destructive",
        });
        return;
      }

      const isAdminUser = formData.user_id === profile?.user_id;
      const participacaoData = {
        concurso_id: concurso.id,
        user_id: formData.user_id,
        numeros_escolhidos: numerosArray,
        quantidade_cotas: parseInt(formData.quantidade_cotas),
        valor_total: isAdminUser ? 0 : parseFloat(formData.quantidade_cotas) * concurso.valor_cota
      };

      if (editingParticipante) {
        const { error } = await supabase
          .from('participacoes')
          .update(participacaoData)
          .eq('id', editingParticipante.id);
        
        if (error) throw error;

        // Atualizar também o registro de pagamento correspondente
        const { error: paymentError } = await supabase
          .from('pagamentos')
          .update({
            quantidade_cotas: parseInt(formData.quantidade_cotas),
            valor_total: isAdminUser ? 0 : parseFloat(formData.quantidade_cotas) * concurso.valor_cota
          })
          .eq('user_id', formData.user_id)
          .eq('concurso_id', concurso.id);

        if (paymentError) {
          console.error('Erro ao atualizar pagamento:', paymentError);
          // Não interrompe o processo se houver erro no pagamento
        }
        
        toast({
          title: "Sucesso",
          description: "Participação atualizada com sucesso!",
        });
      } else {
        // Check if user already has participation in this contest
        const { data: existingParticipacao } = await supabase
          .from('participacoes')
          .select('*')
          .eq('user_id', formData.user_id)
          .eq('concurso_id', concurso.id)
          .single();

        if (existingParticipacao) {
          // Update existing participation
          const novaQuantidadeCotas = existingParticipacao.quantidade_cotas + parseInt(formData.quantidade_cotas);
          const novoValorTotal = isAdminUser ? 0 : existingParticipacao.valor_total + (parseFloat(formData.quantidade_cotas) * concurso.valor_cota);

          const { error } = await supabase
            .from('participacoes')
            .update({
              quantidade_cotas: novaQuantidadeCotas,
              valor_total: novoValorTotal
            })
            .eq('id', existingParticipacao.id);
          
          if (error) throw error;

          // Update corresponding payment record
          const { data: existingPayment } = await supabase
            .from('pagamentos')
            .select('*')
            .eq('user_id', formData.user_id)
            .eq('concurso_id', concurso.id)
            .eq('forma_pagamento', 'admin')
            .single();

          if (existingPayment) {
            const { error: paymentError } = await supabase
              .from('pagamentos')
              .update({
                quantidade_cotas: novaQuantidadeCotas,
                valor_total: isAdminUser ? 0 : novoValorTotal
              })
              .eq('id', existingPayment.id);

            if (paymentError) {
              console.error('Erro ao atualizar pagamento:', paymentError);
            }
          } else {
            // Create new payment record for the additional quotas
            const { error: paymentError } = await supabase
              .from('pagamentos')
              .insert([{
                user_id: formData.user_id,
                concurso_id: concurso.id,
                quantidade_cotas: parseInt(formData.quantidade_cotas),
                valor_total: isAdminUser ? 0 : parseFloat(formData.quantidade_cotas) * concurso.valor_cota,
                forma_pagamento: 'admin',
                status: 'confirmado'
              }]);

            if (paymentError) {
              console.error('Erro ao criar pagamento:', paymentError);
            }
          }

          toast({
            title: "Sucesso",
            description: `Cotas adicionadas! Total atual: ${novaQuantidadeCotas} cotas`,
          });
        } else {
          // Create new participation
          const { error } = await supabase
            .from('participacoes')
            .insert([participacaoData]);
          
          if (error) throw error;

          // Criar registro de pagamento quando admin adiciona participante manualmente
          const { error: paymentError } = await supabase
            .from('pagamentos')
            .insert([{
              user_id: formData.user_id,
              concurso_id: concurso.id,
              quantidade_cotas: parseInt(formData.quantidade_cotas),
              valor_total: isAdminUser ? 0 : parseFloat(formData.quantidade_cotas) * concurso.valor_cota,
              forma_pagamento: 'admin',
              status: 'confirmado'
            }]);

          if (paymentError) {
            console.error('Erro ao criar pagamento:', paymentError);
            // Não interrompe o processo se houver erro no pagamento
          }
          
          toast({
            title: "Sucesso",
            description: "Participação adicionada com sucesso!",
          });
        }
      }

      setShowAddForm(false);
      setEditingParticipante(null);
      resetForm();
      fetchParticipantes();
    } catch (error) {
      console.error('Erro ao salvar participação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar participação",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('participacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Participação removida com sucesso!",
      });
      
      fetchParticipantes();
    } catch (error) {
      console.error('Erro ao deletar participação:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover participação",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (participante: Participante) => {
    setEditingParticipante(participante);
    setFormData({
      user_id: participante.user_id,
      numeros_escolhidos: participante.numeros_escolhidos.join(', '),
      quantidade_cotas: participante.quantidade_cotas.toString()
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      numeros_escolhidos: '',
      quantidade_cotas: '1'
    });
  };

  const { participantes: participantesWithPrize, totalParaSerJogado, totalCotasComAdmin } = prizeDistribution;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Participantes - {concurso.nome} #{concurso.numero}
          </DialogTitle>
          <DialogDescription>
            Gerencie os participantes deste concurso e visualize a distribuição de prêmios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prize Distribution Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Distribuição do Prêmio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    R$ {concurso.premio_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">Prêmio Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {totalCotasComAdmin}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de Cotas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{participantes.length}</p>
                  <p className="text-sm text-muted-foreground">Participantes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {totalParaSerJogado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">Total para Ser Jogado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Participant Button */}
          {profile?.tipo === 'admin' && (
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Lista de Participantes</h3>
              <Button onClick={() => { setShowAddForm(true); setEditingParticipante(null); resetForm(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Participante
              </Button>
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingParticipante ? 'Editar' : 'Adicionar'} Participante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="user_id">Usuário</Label>
                      <Select
                        value={formData.user_id}
                        onValueChange={(value) => setFormData({...formData, user_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                        <SelectContent>
                          {usuarios.map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id}>
                              {usuario.nome} ({usuario.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="numeros_escolhidos">Números (separados por vírgula)</Label>
                      <Input
                        id="numeros_escolhidos"
                        value={formData.numeros_escolhidos}
                        onChange={(e) => setFormData({...formData, numeros_escolhidos: e.target.value})}
                        placeholder="Ex: 1, 15, 23, 31, 45, 60"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="quantidade_cotas">Quantidade de Cotas</Label>
                      <Input
                        id="quantidade_cotas"
                        type="number"
                        min="1"
                        value={formData.quantidade_cotas}
                        onChange={(e) => setFormData({...formData, quantidade_cotas: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingParticipante ? 'Atualizar' : 'Adicionar'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Participants Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Números</TableHead>
                  <TableHead>Cotas</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>% Participação</TableHead>
                  <TableHead>Valor do Prêmio</TableHead>
                  {profile?.tipo === 'admin' && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : participantesWithPrize.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Nenhum participante encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  participantesWithPrize.map((participante) => (
                    <TableRow key={participante.id} className={participante.isAdmin ? "border-l-4 border-l-amber-500" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {participante.profiles?.nome || 'N/A'}
                          {participante.isAdmin && (
                            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700">Admin</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{participante.profiles?.email || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {participante.numeros_escolhidos.map((num, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {num.toString().padStart(2, '0')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{participante.quantidade_cotas}</Badge>
                      </TableCell>
                      <TableCell>
                        R$ {participante.valor_total_display.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {participante.percentage.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        R$ {participante.prizeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      {profile?.tipo === 'admin' && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(participante)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(participante.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantesDialog;