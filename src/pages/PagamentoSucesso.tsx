import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Home, Receipt, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PagamentoSucesso() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      if (error) {
        throw error;
      }

      setPaymentData(data);
      
      if (data.paymentStatus === 'paid') {
        toast({
          title: "Pagamento confirmado!",
          description: "Sua participação foi registrada com sucesso",
        });
      }

    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o pagamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-lg">Verificando pagamento...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Aguarde enquanto confirmamos seu pagamento
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-lg text-muted-foreground">
                  Sessão de pagamento não encontrada
                </p>
                <Button 
                  onClick={() => navigate('/')} 
                  className="mt-4"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isPaymentSuccessful = paymentData?.paymentStatus === 'paid';

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {isPaymentSuccessful ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Receipt className="h-8 w-8 text-yellow-600" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl">
              {isPaymentSuccessful ? 'Pagamento Realizado!' : 'Pagamento Pendente'}
            </CardTitle>
            <CardDescription>
              {isPaymentSuccessful 
                ? 'Sua participação foi registrada com sucesso'
                : 'Aguardando confirmação do pagamento'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {paymentData && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status do Pagamento:</span>
                  <Badge className={isPaymentSuccessful ? 'bg-green-500' : 'bg-yellow-500'}>
                    {isPaymentSuccessful ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ID do Pagamento:</span>
                  <span className="text-sm font-mono">{paymentData.pagamentoId?.slice(-8)}</span>
                </div>
              </div>
            )}
            
            {isPaymentSuccessful && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Parabéns!</strong> Sua participação foi registrada e você receberá os números escolhidos em breve.
                </p>
              </div>
            )}
            
            {!isPaymentSuccessful && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Atenção:</strong> Seu pagamento ainda está sendo processado. Você pode acompanhar o status na página de pagamentos.
                </p>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/pagamentos')}
                className="flex-1"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Ver Pagamentos
              </Button>
              <Button 
                onClick={() => navigate('/concursos')}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Ver Concursos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}