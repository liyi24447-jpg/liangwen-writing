import { useNavigate } from 'react-router-dom';
import {
  BookMarked,
  BarChart3,
  Sparkles,
  BookOpen,
  Type,
  FileText,
  ListOrdered,
  Users,
  Layers,
  PenTool,
  ScrollText,
  ChevronLeft,
  Home,
  Library,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import type { WorkStageKey } from './stages';
import type { IBookWork } from '@/data/novel';
import { STAGES, PHASE_LABELS, computeCompletedStages } from './stages';
import { cn } from '@/lib/utils';

interface WorkbenchSidebarProps {
  book: IBookWork;
  currentStage: WorkStageKey;
  onStageChange: (stage: WorkStageKey) => void;
}

export default function WorkbenchSidebar({ book, currentStage, onStageChange }: WorkbenchSidebarProps) {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const completed = computeCompletedStages(book);

  const phases = [
    { key: 'ideation' as const, label: '立意' },
    { key: 'structure' as const, label: '结构' },
    { key: 'writing' as const, label: '成文' },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-primary/10">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className="size-8 shrink-0 rounded-md bg-gradient-to-br from-primary to-emerald-500 text-primary-foreground flex items-center justify-center">
            <BookMarked className="size-4" />
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-sm font-semibold truncate text-foreground">书案工作台</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {/* 返回藏书阁 */}
        <SidebarGroup className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="返回藏书阁" onClick={() => navigate('/library')}>
                <Library className="size-4 text-primary" />
                <span>返回藏书阁</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="回到首页" onClick={() => navigate('/')}>
                <Home className="size-4" />
                <span>回到首页</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* 快速导航：创作总览 */}
        <SidebarGroup className="p-2">
          <div className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider group-data-[state=collapsed]:hidden">
            概览
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="创作总览"
                isActive={currentStage === 'overview'}
                onClick={() => onStageChange('overview')}
              >
                <BarChart3 className="size-4" />
                <span>创作总览</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* 三阶段 */}
        {phases.map((phase) => {
          const phaseStages = STAGES.filter((s) => s.phase === phase.key);
          return (
            <SidebarGroup key={phase.key} className="p-2">
              <div className="px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider group-data-[state=collapsed]:hidden">
                {PHASE_LABELS[phase.key]}阶段
              </div>
              <SidebarMenu>
                {phaseStages.map((stage) => {
                  const Icon = stage.icon;
                  const done = completed.has(stage.key);
                  const active = currentStage === stage.key;
                  return (
                    <SidebarMenuItem key={stage.key}>
                      <SidebarMenuButton
                        tooltip={stage.label}
                        isActive={active}
                        onClick={() => onStageChange(stage.key)}
                      >
                        <div className="relative shrink-0">
                          <Icon className="size-4" />
                          {done && (
                            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="flex-1 truncate">{stage.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
