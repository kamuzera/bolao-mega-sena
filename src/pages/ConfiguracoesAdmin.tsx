import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface ConfiguracoesAdmin {
  id: string;
  percentual_comissao: number;
  cotas_gratuitas: number;
}

const configSchema = z.object({
  percentual_comissao: z.number().min(0, 'Percentual deve ser maior que 0').max(100, 'Percentual deve ser menor que 100'),
  cotas_gratuitas: z.number().min(0, 'Cotas gratuitas deve ser maior ou igual a 0'),
});

type ConfigFormData = z.infer<typeof configSchema>;

const ConfiguracoesAdmin = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesAdmin | null>(null);

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      percentual_comissao: 10,
      cotas_gratuitas: 3,
    },
  });

  useEffect(() => {
    if (profile?.tipo === 'admin') {
      fetchConfiguracoes();
    }
  }, [profile]);

  const fetchConfiguracoes = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_admin')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfiguracoes(data);
        form.reset({
          percentual_comissao: data.percentual_comissao,
          cotas_gratuitas: data.cotas_gratuitas,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: ConfigFormData) => {
    setSaving(true);
    try {
      if (configuracoes) {
        // Atualizar configurações existentes
        const { error } = await supabase
          .from('configuracoes_admin')
          .update({
            percentual_comissao: data.percentual_comissao,
            cotas_gratuitas: data.cotas_gratuitas,
          })
          .eq('id', configuracoes.id);

        if (error) throw error;
      } else {
        // Criar novas configurações
        const { error } = await supabase
          .from('configuracoes_admin')
          .insert({
            percentual_comissao: data.percentual_comissao,
            cotas_gratuitas: data.cotas_gratuitas,
          });

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });

      fetchConfiguracoes();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
          <span className="ml-2">Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configurações Administrativas</h1>
          <p className="text-muted-foreground">Configure os benefícios e comissões do administrador</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Benefícios do Administrador</CardTitle>
            <CardDescription>
              Configure os benefícios que o administrador recebe automaticamente em cada concurso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="percentual_comissao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentual de Comissão (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="10.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        Percentual que o administrador recebe do valor total arrecadado em cada concurso
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cotas_gratuitas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cotas Gratuitas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="3"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        Número de cotas gratuitas que o administrador recebe automaticamente em cada concurso
                      </p>
                    </FormItem>
                  )}
                />


                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>Comissão atual:</span>
                <span className="font-medium">{form.watch('percentual_comissao') || 0}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span>Cotas gratuitas:</span>
                <span className="font-medium">{form.watch('cotas_gratuitas') || 0} cotas</span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Como funciona:</strong> Em cada concurso, o administrador recebe automaticamente 
                  {form.watch('percentual_comissao') || 0}% do <strong>valor total arrecadado</strong> como comissão, 
                  além de {form.watch('cotas_gratuitas') || 0} cotas gratuitas para participação. 
                  <br />
                  <strong>Exemplo:</strong> Total arrecadado R$ 600,00 - Cotas do admin R$ 100,00 (3 cotas × valor médio) - Comissão R$ 60,00 (10%) = R$ 560,00 para ser jogado.
                </p>
              </div>
            </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default ConfiguracoesAdmin;