import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone?: string;
  tipo: 'admin' | 'participante';
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string, telefone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              if (error) {
                // Se não encontrou o perfil, usuário foi excluído
                console.log('Perfil não encontrado - usuário foi excluído');
                toast({
                  title: "Conta Excluída",
                  description: "Sua conta foi excluída do sistema. Você será deslogado.",
                  variant: "destructive",
                });
                await supabase.auth.signOut();
                return;
              }

              const profile = data as Profile;
              
              // Verificar se usuário está ativo
              if (!profile.ativo) {
                console.log('Usuário desativado - deslogando');
                toast({
                  title: "Conta Desativada",
                  description: "Sua conta foi desativada. Você será deslogado.",
                  variant: "destructive",
                });
                await supabase.auth.signOut();
                return;
              }

              setProfile(profile);
            } catch (error) {
              console.error('Erro ao buscar perfil:', error);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Verificação periódica do status do usuário
  useEffect(() => {
    if (!user || !profile) return;

    const checkUserStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('ativo')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // Usuário foi excluído
          console.log('Usuário excluído - deslogando');
          toast({
            title: "Conta Excluída",
            description: "Sua conta foi excluída do sistema. Você será deslogado.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          return;
        }

        if (!data.ativo) {
          // Usuário foi desativado
          console.log('Usuário desativado - deslogando');
          toast({
            title: "Conta Desativada",
            description: "Sua conta foi desativada. Você será deslogado.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar status do usuário:', error);
      }
    };

    // Verificar a cada 30 segundos
    const interval = setInterval(checkUserStatus, 30000);

    return () => clearInterval(interval);
  }, [user, profile, toast]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
      }
      
      return { error };
    } catch (error) {
      console.error('Erro no login:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, nome: string, telefone?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nome: nome,
            telefone: telefone
          }
        }
      });
      
      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        if (signUpData?.user) {
          const telefoneSanitizado = telefone?.trim() || null;

          const { error: profileError } = await supabase.rpc('set_profile_info', {
            _user_id: signUpData.user.id,
            _nome: nome,
            _email: email,
            _telefone: telefoneSanitizado,
          });

          if (profileError) {
            console.error('Erro ao atualizar perfil após cadastro:', profileError);
          }
        }

        toast({
          title: "Cadastro realizado",
          description: "Verifique seu email para confirmar a conta.",
        });
      }
      
      return { error };
    } catch (error) {
      console.error('Erro no cadastro:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};