import { Route } from '../components/shared/RouteBadge';

export interface Dist { name: string; value: number; pct: number }
export interface Summary {
  total: number;
  counts: { edge: number; cloud: number; human: number };
  pct: { edge: number; cloud: number; human: number };
  avg_processing_time: number;
  avg_scores: Record<string, number>;
  privacy_distribution: Dist[]; sensitivity_distribution: Dist[]; complexity_distribution: Dist[]; risk_distribution: Dist[];
  daily: { date: string; day: string; edge: number; cloud: number; human: number }[];
  hourly_volume: { time: string; queries: number }[];
  response_time_by_hour: { time: string; avg: number }[];
  human_review_rate: number;
  sensitive_total: number; sensitive_kept_off_cloud: number;
  router_used: Record<string, number>;
  avg_time_by_route: { edge: number | null; cloud: number | null; human: number | null };
}
export interface ConvSummary { id: number; title: string; route: Route; status: string; msgs: number; preview: string; created_at: string; updated_at: string }
export interface UserStats extends Summary { conversations: number; pending_reviews: number; recent: ConvSummary[] }

const d3 = (n: string[]) => n.map(name => ({ name, value: 0, pct: 0 }));
export const EMPTY_SUMMARY: Summary = {
  total: 0, counts: { edge: 0, cloud: 0, human: 0 }, pct: { edge: 0, cloud: 0, human: 0 }, avg_processing_time: 0, avg_scores: {},
  privacy_distribution: d3(['Low', 'Medium', 'High']), sensitivity_distribution: d3(['Low', 'Medium', 'High']),
  complexity_distribution: d3(['Low', 'Medium', 'High']), risk_distribution: d3(['Low', 'Medium', 'High']),
  daily: [], hourly_volume: [], response_time_by_hour: [], human_review_rate: 0, sensitive_total: 0, sensitive_kept_off_cloud: 0,
  router_used: {}, avg_time_by_route: { edge: null, cloud: null, human: null },
};
export const EMPTY_USER_STATS: UserStats = { ...EMPTY_SUMMARY, conversations: 0, pending_reviews: 0, recent: [] };

export const ROUTE_COLORS = { edge: '#16A34A', cloud: '#2563EB', human: '#F59E0B' };
export const routingPie = (pct: Summary['pct']) => [
  { name: 'Edge AI', value: pct.edge, color: ROUTE_COLORS.edge },
  { name: 'Cloud AI', value: pct.cloud, color: ROUTE_COLORS.cloud },
  { name: 'Human Review', value: pct.human, color: ROUTE_COLORS.human },
];
export const distPct = (d: Dist[], name: string) => d.find(x => x.name === name)?.pct ?? 0;

export interface ReviewItem { id: number; code: string; query: string; status: string; risk: string; sensitivity: string; created_at: string }
export interface ReviewHistoryItem extends ReviewItem { action: string; reviewer: string; completed_at: string | null; review_minutes: number | null }
export interface ReviewStats {
  pending: number; in_review: number; completed: number; completed_today: number; high_risk_pending: number; avg_review_minutes: number;
  outcomes: Dist[]; activity: { day: string; approved: number; modified: number; rejected: number }[]; risk_distribution: { name: string; value: number }[];
}
export interface ReviewDetail extends ReviewItem {
  query_full: string; user_ref: string; ai_draft: string; has_draft: boolean; comment: string; reviewer_id: number | null;
  analysis: { privacy: string; sensitivity: string; complexity: string; risk: string; latency: string; route: string; domain: string; reason: string;
             scores: Record<string, number> } | null;
}

export interface AdminStats extends Summary { users: number; review: ReviewStats; recent_events: { type: string; msg: string; time: string }[] }
export interface MonitorService { name: string; status: string; responseTime: string; detail: string }
export interface MonitoringData { services: MonitorService[]; timeline: { time: string; type: string; msg: string }[]; router_mode: string }
export interface AdminUser { id: number; code: string; name: string; email: string; role: string; status: string; joined: string; queries: number }
export interface LogRow { id: string; ts: string; privacy: string; sensitivity: string; complexity: string; risk: string; route: string; ms: number | null; status: string; router: string; reason: string; scores: Record<string, number> }

export interface ReviewMonitoring extends ReviewStats { recent_events: { code: string; action: string; reviewer: string; risk: string; time: string }[] }

export interface NotificationItem { id: number; type: string; icon: string; title: string; message: string; read: boolean; created_at: string }
export interface NotificationsResponse { items: NotificationItem[]; unread: number }
