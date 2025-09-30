import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Trophy, 
  Users, 
  Settings, 
  LogOut, 
  Home, 
  Ticket, 
  Target,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/20 text-primary font-medium" : "hover:bg-muted/50";

  const menuItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Concursos", url: "/concursos", icon: Trophy },
    { title: "Participações", url: "/participacoes", icon: Ticket },
    { title: "Pagamentos", url: "/pagamentos", icon: CreditCard },
    { title: "Resultados", url: "/resultados", icon: Target },
  ];

  const adminItems = [
    { title: "Controle de Usuários", url: "/usuarios", icon: Users },
    { title: "Configurações Admin", url: "/configuracoes-admin", icon: Settings },
    { title: "Integração WhatsApp", url: "/integracao-whatsapp", icon: MessageSquare },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center space-x-2">
          <Trophy className="h-8 w-8 text-primary" />
          {state === 'expanded' && (
            <div>
              <h2 className="text-lg font-bold">Mega-Sena</h2>
              <p className="text-sm text-muted-foreground">Bolão</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {state === 'expanded' && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {profile?.tipo === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {state === 'expanded' && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        {state === 'expanded' && profile && (
          <div className="mb-4">
            <p className="text-sm font-medium">{profile.nome}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.tipo}</p>
          </div>
        )}
        <Button 
          variant="ghost" 
          onClick={signOut}
          className="w-full justify-start"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {state === 'expanded' && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;