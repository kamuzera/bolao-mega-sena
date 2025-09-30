import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Concurso {
  id: string;
  nome: string;
  numero: number;
  valor_cota: number;
  max_cotas: number;
  cotas_vendidas: number;
  status: string;
}

interface ComprarCotasDialogProps {
  concurso: Concurso;
  onSuccess?: () => void;
}

export function ComprarCotasDialog({ concurso, onSuccess }: ComprarCotasDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [quantidadeCotas, setQuantidadeCotas] = useState(1);
  const [loading, setLoading] = useState(false);

  const cotasDisponiveis = concurso.max_cotas - concurso.cotas_vendidas;
  const valorTotal = Number(concurso.valor_cota) * quantidadeCotas;

  const handleComprar = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para comprar cotas",
        variant: "destructive"
      });
      return;
    }

    if (quantidadeCotas <= 0) {
      toast({
        title: "Erro",
        description: "Quantidade de cotas deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    if (quantidadeCotas > cotasDisponiveis) {
      toast({
        title: "Erro",
        description: `Apenas ${cotasDisponiveis} cotas disponíveis`,
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Create payment via edge function
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          concursoId: concurso.id,
          quantidadeCotas: quantidadeCotas
        }
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecionando para pagamento",
          description: "Você será redirecionado para o Stripe para completar o pagamento",
        });

        setOpen(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('URL de pagamento não retornada');
      }

    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar pagamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (concurso.status !== 'aberto') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full"
          disabled={cotasDisponiveis <= 0}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {cotasDisponiveis > 0 ? 'Comprar Cotas' : 'Esgotado'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comprar Cotas - {concurso.nome}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Concurso */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{concurso.nome}</CardTitle>
              <CardDescription>Concurso Nº {concurso.numero}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor por cota:</span>
                <span className="font-medium">{formatCurrency(concurso.valor_cota)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cotas disponíveis:</span>
                <Badge variant="outline">{cotasDisponiveis} de {concurso.max_cotas}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade de Cotas</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              max={cotasDisponiveis}
              value={quantidadeCotas}
              onChange={(e) => setQuantidadeCotas(parseInt(e.target.value) || 1)}
              placeholder="Quantas cotas deseja comprar?"
            />
            {quantidadeCotas > 1 && (
              <p className="text-sm text-muted-foreground">
                Comprando {quantidadeCotas} cotas por {formatCurrency(valorTotal)}
              </p>
            )}
          </div>

          {/* Resumo do Pagamento */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Total a Pagar</p>
                  <p className="text-sm text-muted-foreground">
                    {quantidadeCotas} cota(s) × {formatCurrency(concurso.valor_cota)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(valorTotal)}
                  </p>
                  <Badge className="bg-blue-500">Cartão</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleComprar} 
              disabled={loading || !user}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar com Cartão
                </>
              )}
            </Button>
          </div>

          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              Você precisa estar logado para comprar cotas
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}