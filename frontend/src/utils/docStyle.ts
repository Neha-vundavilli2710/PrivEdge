import { BookOpen, HelpCircle, Shield, FileText } from 'lucide-react';

const STYLES: Record<string, { icon: any; color: string; bg: string }> = {
  Guide: { icon: BookOpen, color: '#2563EB', bg: '#DBEAFE' },
  Support: { icon: HelpCircle, color: '#F59E0B', bg: '#FEF3C7' },
  Security: { icon: Shield, color: '#7C3AED', bg: '#EDE9FE' },
  FAQ: { icon: HelpCircle, color: '#16A34A', bg: '#DCFCE7' },
  Technical: { icon: FileText, color: '#0891B2', bg: '#CFFAFE' },
  Legal: { icon: Shield, color: '#DC2626', bg: '#FEE2E2' },
};
export const docStyle = (type: string) => STYLES[type] ?? STYLES.Technical;
export interface KDoc { id: number; title: string; type: string; description: string; version: string; status: string; updated_at: string; content?: string }
