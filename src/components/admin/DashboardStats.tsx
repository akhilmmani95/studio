import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
  } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
  
  type DashboardStatsProps = {
    title: string;
    value: string;
    icon: LucideIcon;
    description: string;
  };
  
  export function DashboardStats({ title, value, icon: Icon, description }: DashboardStatsProps) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    );
  }
  