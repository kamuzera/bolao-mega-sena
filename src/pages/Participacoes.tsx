import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Calendar, DollarSign, Trophy, Target, Edit, Trash2, User, Search, Check, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Participacao {
  id: string;
  user_id: string;
  concurso_id: string;
  numeros_escolhidos: number[];
  quantidade_cotas: number;
  valor_total: number;
  data_participacao: string;
  numeros_acertados: number;
  premiado: boolean;
  valor_premio: number;
  concursos: {
    nome: string;
    numero: number;
    data_sorteio: string;
    status: string;
    numeros_sorteados: number[] | null;
  };
  profiles?: {
    nome: string;
    email: string;
  };
}

interface Concurso {
  id: string;
  nome: string;
  numero: number;
  status: string;
  valor_cota: number;
  max_cotas: number;
  cotas_vendidas: number;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

const Participacoes = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [concursosAtivos, setConcursosAtivos] = useState<Concurso[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParticipacao, setEditingParticipacao] = useState<Participacao | null>(null);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [selectedConcurso, setSelectedConcurso] = useState<Concurso | null>(null);
  const [isConcursoSearchOpen, setIsConcursoSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [formData, setFormData] = useState({
    concurso_id: '',
    user_id: '',
    numeros_escolhidos: [] as number[],
    quantidade_cotas: 1
  });

  useEffect(() => {
    fetchParticipacoes();
    fetchConcursosAtivos();
    if (profile?.tipo === 'admin') {
      fetchUsuarios();
    }
  }, [profile]);

  const fetchParticipacoes = async () => {
    try {
      // Build the base query
      let participacoesQuery = supabase
        .from('participacoes')
        .select(`
          *,
          concursos:concurso_id (
            nome,
            numero,
            data_sorteio,
            status,
            numeros_sorteados
          )
        `)
        .order('data_participacao', { ascending: false });

      // Filter by user if not admin
      if (profile?.tipo !== 'admin') {
        participacoesQuery = participacoesQuery.eq('user_id', user?.id);
      }

      const { data: participacoesData, error: participacoesError } = await participacoesQuery;
      if (participacoesError) throw participacoesError;

      // Get profiles for admin view
      let participacoesWithProfiles = participacoesData || [];
      
      if (profile?.tipo === 'admin' && participacoesData && participacoesData.length > 0) {
        const userIds = participacoesData.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, nome, email')
          .in('user_id', userIds);

        participacoesWithProfiles = participacoesData.map(participacao => ({
          ...participacao,
          profiles: profilesData?.find(profile => profile.user_id === participacao.user_id) || null
        }));
      }

      setParticipacoes(participacoesWithProfiles);
    } catch (error) {
      console.error('Erro ao buscar participações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar participações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConcursosAtivos = async () => {
    try {
      const { data, error } = await supabase
        .from('concursos')
        .select('id, nome, numero, status, valor_cota, max_cotas, cotas_vendidas')
        .eq('status', 'aberto')
        .order('data_sorteio', { ascending: true });

      if (error) throw error;
      setConcursosAtivos(data || []);
    } catch (error) {
      console.error('Erro ao buscar concursos:', error);
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

  const handleNumeroClick = (numero: number) => {
    if (formData.numeros_escolhidos.includes(numero)) {
      setFormData({
        ...formData,
        numeros_escolhidos: formData.numeros_escolhidos.filter(n => n !== numero)
      });
    } else if (formData.numeros_escolhidos.length < 6) {
      setFormData({
        ...formData,
        numeros_escolhidos: [...formData.numeros_escolhidos, numero].sort((a, b) => a - b)
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.numeros_escolhidos.length !== 6) {
      toast({
        title: "Erro",
        description: "Você deve escolher exatamente 6 números",
        variant: "destructive",
      });
      return;
    }

    try {
      const concursoSelecionado = concursosAtivos.find(c => c.id === formData.concurso_id);
      if (!concursoSelecionado) throw new Error('Concurso não encontrado');

      const participacaoData = {
        concurso_id: formData.concurso_id,
        user_id: profile?.tipo === 'admin' ? formData.user_id : user?.id,
        numeros_escolhidos: formData.numeros_escolhidos,
        quantidade_cotas: formData.quantidade_cotas,
        valor_total: formData.quantidade_cotas * concursoSelecionado.valor_cota
      };

      if (editingParticipacao) {
        const { error } = await supabase
          .from('participacoes')
          .update(participacaoData)
          .eq('id', editingParticipacao.id);
        
        if (error) throw error;
        toast({ title: "Sucesso", description: "Participação atualizada!" });
      } else {
        const { error } = await supabase
          .from('participacoes')
          .insert([participacaoData]);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Participação criada!" });
      }

      setIsDialogOpen(false);
      setEditingParticipacao(null);
      resetForm();
      fetchParticipacoes();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao salvar participação", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      concurso_id: '',
      user_id: '',
      numeros_escolhidos: [],
      quantidade_cotas: 1
    });
    setSelectedUsuario(null);
    setSelectedConcurso(null);
  };

  const handleEdit = (participacao: Participacao) => {
    setEditingParticipacao(participacao);
    setFormData({
      concurso_id: participacao.concurso_id,
      user_id: participacao.user_id,
      numeros_escolhidos: participacao.numeros_escolhidos,
      quantidade_cotas: participacao.quantidade_cotas
    });
    
    // Definir usuário e concurso selecionados para edição
    const usuario = usuarios.find(u => u.id === participacao.user_id);
    const concurso = concursosAtivos.find(c => c.id === participacao.concurso_id);
    setSelectedUsuario(usuario || null);
    setSelectedConcurso(concurso || null);
    
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta participação?')) return;
    
    try {
      const { error } = await supabase.from('participacoes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Participação removida!" });
      fetchParticipacoes();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao remover participação", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="p-6">Carregando participações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {profile?.tipo === 'admin' ? 'Todas as Participações' : 'Minhas Participações'}
          </h1>
          <p className="text-muted-foreground">
            {profile?.tipo === 'admin' 
              ? 'Gerencie todas as participações dos usuários'
              : 'Acompanhe suas participações nos concursos'
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
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingParticipacao(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Participação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingParticipacao ? 'Editar' : 'Nova'} Participação
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {profile?.tipo === 'admin' && (
                    <div>
                      <Label>Selecionar Usuário</Label>
                      <Popover open={isUserSearchOpen} onOpenChange={setIsUserSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isUserSearchOpen}
                            className="w-full justify-between"
                          >
                            {selectedUsuario ? (
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{selectedUsuario.nome}</span>
                                <span className="text-sm text-muted-foreground">{selectedUsuario.email}</span>
                              </div>
                            ) : (
                              "Selecione um usuário..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Buscar usuário..." 
                            />
                            <CommandList>
                              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                              <CommandGroup>
                                {usuarios.map((usuario) => (
                                  <CommandItem
                                    key={usuario.id}
                                    value={`${usuario.nome} ${usuario.email}`}
                                    onSelect={() => {
                                      setSelectedUsuario(usuario);
                                      setFormData({...formData, user_id: usuario.id});
                                      setIsUserSearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        selectedUsuario?.id === usuario.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{usuario.nome}</span>
                                      <span className="text-sm text-muted-foreground">{usuario.email}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  
                  <div>
                    <Label>Selecionar Concurso</Label>
                    <Popover open={isConcursoSearchOpen} onOpenChange={setIsConcursoSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isConcursoSearchOpen}
                          className="w-full justify-between"
                        >
                          {selectedConcurso ? (
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{selectedConcurso.nome} #{selectedConcurso.numero}</span>
                              <span className="text-sm text-muted-foreground">R$ {selectedConcurso.valor_cota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          ) : (
                            "Selecione um concurso..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar concurso..." 
                          />
                          <CommandList>
                            <CommandEmpty>Nenhum concurso encontrado.</CommandEmpty>
                            <CommandGroup>
                              {concursosAtivos.map((concurso) => (
                                <CommandItem
                                  key={concurso.id}
                                  value={`${concurso.nome} ${concurso.numero}`}
                                  onSelect={() => {
                                    setSelectedConcurso(concurso);
                                    setFormData({...formData, concurso_id: concurso.id});
                                    setIsConcursoSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedConcurso?.id === concurso.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{concurso.nome} #{concurso.numero}</span>
                                    <span className="text-sm text-muted-foreground">R$ {concurso.valor_cota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Números (selecione 6)</Label>
                    <div className="grid grid-cols-10 gap-2 mt-2">
                      {Array.from({ length: 60 }, (_, i) => i + 1).map((numero) => (
                        <Button
                          key={numero}
                          type="button"
                          variant={formData.numeros_escolhidos.includes(numero) ? "default" : "outline"}
                          size="sm"
                          className="aspect-square p-0 text-xs"
                          onClick={() => handleNumeroClick(numero)}
                        >
                          {numero.toString().padStart(2, '0')}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Selecionados: {formData.numeros_escolhidos.length}/6
                    </p>
                  </div>

                  <div>
                    <Label>Quantidade de Cotas</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.quantidade_cotas}
                      onChange={(e) => setFormData({...formData, quantidade_cotas: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={formData.numeros_escolhidos.length !== 6}>
                    {editingParticipacao ? 'Atualizar' : 'Criar'} Participação
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Admin Table View */}
      {viewMode === 'table' ? (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {profile?.tipo === 'admin' && <TableHead>Participante</TableHead>}
                  <TableHead>Concurso</TableHead>
                  <TableHead>Data Sorteio</TableHead>
                  <TableHead>Números</TableHead>
                  <TableHead>Cotas</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participacoes.map((participacao) => (
                  <TableRow key={participacao.id}>
                    {profile?.tipo === 'admin' && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{participacao.profiles?.nome || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{participacao.profiles?.email || 'N/A'}</p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div>
                        <p className="font-medium">{participacao.concursos.nome}</p>
                        <p className="text-sm text-muted-foreground">#{participacao.concursos.numero}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(participacao.concursos.data_sorteio).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {participacao.numeros_escolhidos.map((num, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {num.toString().padStart(2, '0')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{participacao.quantidade_cotas}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {participacao.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={participacao.concursos.status === 'aberto' ? 'default' : 'secondary'}>
                        {participacao.concursos.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(participacao)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(participacao.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {participacoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={profile?.tipo === 'admin' ? 8 : 7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Trophy className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhuma participação encontrada</p>
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
          {participacoes.map((participacao) => (
            <Card key={participacao.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {participacao.concursos.nome}
                    </CardTitle>
                    <CardDescription>
                      Concurso #{participacao.concursos.numero}
                    </CardDescription>
                    {profile?.tipo === 'admin' && participacao.profiles && (
                      <p className="text-sm text-muted-foreground">
                        {participacao.profiles.nome}
                      </p>
                    )}
                  </div>
                  <Badge variant={participacao.concursos.status === 'aberto' ? 'default' : 'secondary'}>
                    {participacao.concursos.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Informações principais */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">Sorteio:</span>
                      <span className="font-medium">{new Date(participacao.concursos.data_sorteio).toLocaleDateString('pt-BR')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium">R$ {participacao.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  
                  {/* Números escolhidos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Números escolhidos:</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {participacao.numeros_escolhidos.map((num, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {num.toString().padStart(2, '0')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Informações da participação */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cotas:</span>
                      <span className="font-medium">{participacao.quantidade_cotas}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {profile?.tipo === 'admin' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(participacao)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(participacao.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {participacoes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma participação encontrada</h3>
            <p className="text-muted-foreground">
              {profile?.tipo === 'admin'
                ? 'Nenhuma participação foi registrada ainda.'
                : 'Participe de um concurso para começar a concorrer aos prêmios!'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Participacoes;