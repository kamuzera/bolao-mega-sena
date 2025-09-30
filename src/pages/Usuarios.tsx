import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PhoneInput } from '@/components/ui/phone-input';
import { Loader2, Plus, Edit, Trash2, User, Search, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone?: string;
  tipo: 'admin' | 'participante';
  ativo: boolean;
  created_at: string;
}

const userSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Telefone deve conter apenas números e código do país').optional(),
  tipo: z.enum(['admin', 'participante'], { required_error: 'Selecione um tipo' }),
  ativo: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

const Usuarios = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Profile[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      tipo: 'participante',
      ativo: true,
    },
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Filtrar usuários baseado na busca
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsuarios(usuarios);
    } else {
      const filtered = usuarios.filter(usuario =>
        usuario.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usuario.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (usuario.telefone && usuario.telefone.includes(searchQuery))
      );
      setFilteredUsuarios(filtered);
    }
  }, [usuarios, searchQuery]);

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios((data || []) as Profile[]);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: UserFormData) => {
    try {
      if (!editingUser) {
        toast({
          title: "Funcionalidade não disponível",
          description: "Criação de novos usuários deve ser feita através do cadastro.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar o usuário no banco de dados
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: data.nome,
          telefone: data.telefone || null,
          tipo: data.tipo,
          ativo: data.ativo,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });

      setDialogOpen(false);
      setEditingUser(null);
      form.reset();
      fetchUsuarios();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar usuário",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (usuario: Profile) => {
    setEditingUser(usuario);
    form.reset({
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone || '',
      tipo: usuario.tipo,
      ativo: usuario.ativo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    const usuario = usuarios.find(u => u.id === userId);
    const isActive = usuario?.ativo;

    if (isActive) {
      // Se usuário está ativo, desativar
      if (!confirm('Tem certeza que deseja desativar este usuário?')) return;

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ ativo: false })
          .eq('id', userId);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Usuário desativado com sucesso",
        });

        fetchUsuarios();
      } catch (error) {
        console.error('Erro ao desativar usuário:', error);
        toast({
          title: "Erro",
          description: "Erro ao desativar usuário",
          variant: "destructive",
        });
      }
    } else {
      // Se usuário está inativo, reativar
      if (!confirm('Tem certeza que deseja reativar este usuário?')) return;

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ ativo: true })
          .eq('id', userId);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Usuário reativado com sucesso",
        });

        fetchUsuarios();
      } catch (error) {
        console.error('Erro ao reativar usuário:', error);
        toast({
          title: "Erro",
          description: "Erro ao reativar usuário",
          variant: "destructive",
        });
      }
    }
  };

  const handlePermanentDelete = async (userId: string) => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\nTem certeza que deseja EXCLUIR PERMANENTEMENTE este usuário?\n\nTodos os dados relacionados serão perdidos.')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário excluído permanentemente",
      });

      fetchUsuarios();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    form.reset();
    setEditingUser(null);
    setDialogOpen(false);
  };

  const getStatusBadge = (ativo: boolean) => {
    return (
      <Badge variant={ativo ? "default" : "secondary"}>
        {ativo ? "Ativo" : "Inativo"}
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    return (
      <Badge variant={tipo === 'admin' ? "destructive" : "outline"}>
        {tipo === 'admin' ? "Administrador" : "Participante"}
      </Badge>
    );
  };

  if (profile?.tipo !== 'admin') {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Acesso negado. Apenas administradores podem acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando usuários...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Controle de Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar usuários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
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
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingUser(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingUser 
                        ? 'Edite as informações do usuário.' 
                        : 'Para novos usuários, use o sistema de cadastro.'
                      }
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <FormField
                      control={form.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="email@exemplo.com" 
                              type="email" 
                              {...field}
                              disabled={!!editingUser}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="telefone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone (WhatsApp)</FormLabel>
                          <FormControl>
                            <PhoneInput 
                              placeholder="(11) 99999-9999"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Selecione o país e digite o número
                          </p>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="participante">Participante</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingUser ? 'Atualizar' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === 'table' ? (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{usuario.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{usuario.email}</span>
                    </TableCell>
                    <TableCell>
                      {usuario.telefone ? (
                        <span className="text-sm">📱 {usuario.telefone}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getTipoBadge(usuario.tipo)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(usuario.ativo)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(usuario)}
                          title="Editar usuário"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {usuario.ativo ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(usuario.id)}
                            title="Desativar usuário"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(usuario.id)}
                            title="Reativar usuário"
                          >
                            <User className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handlePermanentDelete(usuario.id)}
                          title="Excluir permanentemente"
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredUsuarios.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchQuery.trim() ? 'Nenhum usuário encontrado para a busca' : 'Nenhum usuário encontrado'}
                        </p>
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
          {filteredUsuarios.map((usuario) => (
            <Card key={usuario.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {usuario.nome}
                    </CardTitle>
                    <CardDescription>
                      {usuario.email}
                    </CardDescription>
                    {usuario.telefone && (
                      <p className="text-sm text-muted-foreground">
                        📱 {usuario.telefone}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {getTipoBadge(usuario.tipo)}
                    {getStatusBadge(usuario.ativo)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Informações principais */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Criado em:</span>
                      <span className="font-medium">{new Date(usuario.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleEdit(usuario)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    {usuario.ativo ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDelete(usuario.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Desativar
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDelete(usuario.id)}
                      >
                        <User className="h-4 w-4 mr-1" />
                        Reativar
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handlePermanentDelete(usuario.id)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredUsuarios.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery.trim() ? 'Nenhum usuário encontrado para a busca' : 'Nenhum usuário encontrado'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery.trim() ? 'Tente ajustar os termos de busca.' : 'Nenhum usuário foi registrado ainda.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Usuarios;