import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, CreditCard, ShieldCheck, Users } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Faction Panel+',
  description: 'Overview of your faction activities.',
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,231</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Factions
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+23</div>
            <p className="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,234.56</div>
            <p className="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.8%</div>
            <p className="text-xs text-muted-foreground">
              +0.2% from last month
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            An overview of the latest events in your faction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="font-medium">John Doe</div>
                  <div className="text-sm text-muted-foreground">
                    john.doe@email.com
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">Joined Faction</Badge>
                </TableCell>
                <TableCell className="text-right">2024-05-23</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="font-medium">Jane Smith</div>
                  <div className="text-sm text-muted-foreground">
                    jane.smith@email.com
                  </div>
                </TableCell>
                <TableCell>
                  <Badge>Promoted</Badge>
                </TableCell>
                <TableCell className="text-right">2024-05-22</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="font-medium">Michael Johnson</div>
                  <div className="text-sm text-muted-foreground">
                    michael.j@email.com
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Completed Quest</Badge>
                </TableCell>
                <TableCell className="text-right">2024-05-21</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <div className="font-medium">Emily Davis</div>
                  <div className="text-sm text-muted-foreground">
                    emily.d@email.com
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">Left Faction</Badge>
                </TableCell>
                <TableCell className="text-right">2024-05-20</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
