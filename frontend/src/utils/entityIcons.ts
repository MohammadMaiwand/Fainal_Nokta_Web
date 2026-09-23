import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers,
  MessageSquare,
  ShieldCheck,
  Users,
  Wallet
} from 'lucide-react';
import { AfghaniIcon } from '@/components/icons/AfghaniIcon';

export type EntityIconStyle = {
  icon: LucideIcon;
  iconClassName: string;
  backgroundClassName: string;
};

const DEFAULT_ICON_STYLE: EntityIconStyle = {
  icon: FileText,
  iconClassName: 'text-slate-300',
  backgroundClassName: 'from-slate-500/20 via-slate-400/10 to-slate-600/20'
};

export const PERSON_ENTITY_PATHS = new Set(['/students', '/teachers', '/users']);

export function usesPersonAvatar(entityPath: string) {
  return PERSON_ENTITY_PATHS.has(entityPath);
}

const ENTITY_ICON_STYLES: Record<string, EntityIconStyle> = {
  '/branches': {
    icon: Building2,
    iconClassName: 'text-orange-300',
    backgroundClassName: 'from-orange-500/25 via-amber-400/10 to-orange-600/20'
  },
  '/classes': {
    icon: Layers,
    iconClassName: 'text-purple-300',
    backgroundClassName: 'from-purple-500/25 via-violet-400/10 to-purple-600/20'
  },
  '/subjects': {
    icon: BookOpen,
    iconClassName: 'text-orange-300',
    backgroundClassName: 'from-orange-500/25 via-amber-400/10 to-orange-600/20'
  },
  '/courses': {
    icon: BookOpen,
    iconClassName: 'text-cyan-300',
    backgroundClassName: 'from-cyan-500/25 via-sky-400/10 to-cyan-600/20'
  },
  '/notifications': {
    icon: Bell,
    iconClassName: 'text-sky-300',
    backgroundClassName: 'from-sky-500/25 via-blue-400/10 to-sky-600/20'
  },
  '/books': {
    icon: BookOpen,
    iconClassName: 'text-cyan-300',
    backgroundClassName: 'from-cyan-500/25 via-teal-400/10 to-cyan-600/20'
  },
  '/families': {
    icon: Users,
    iconClassName: 'text-pink-300',
    backgroundClassName: 'from-pink-500/25 via-rose-400/10 to-pink-600/20'
  },
  '/attendance': {
    icon: ClipboardList,
    iconClassName: 'text-sky-300',
    backgroundClassName: 'from-sky-500/25 via-cyan-400/10 to-sky-600/20'
  },
  '/exams': {
    icon: CalendarCheck,
    iconClassName: 'text-indigo-300',
    backgroundClassName: 'from-indigo-500/25 via-violet-400/10 to-indigo-600/20'
  },
  '/results': {
    icon: GraduationCap,
    iconClassName: 'text-emerald-300',
    backgroundClassName: 'from-emerald-500/25 via-green-400/10 to-emerald-600/20'
  },
  '/payments': {
    icon: AfghaniIcon,
    iconClassName: 'text-lime-300',
    backgroundClassName: 'from-lime-500/25 via-green-400/10 to-lime-600/20'
  },
  '/finance': {
    icon: AfghaniIcon,
    iconClassName: 'text-yellow-300',
    backgroundClassName: 'from-yellow-500/25 via-amber-400/10 to-yellow-600/20'
  },
  '/loans': {
    icon: Wallet,
    iconClassName: 'text-amber-300',
    backgroundClassName: 'from-amber-500/25 via-yellow-400/10 to-amber-600/20'
  },
  '/expenses': {
    icon: AfghaniIcon,
    iconClassName: 'text-rose-300',
    backgroundClassName: 'from-rose-500/25 via-red-400/10 to-rose-600/20'
  },
  '/reports': {
    icon: Activity,
    iconClassName: 'text-violet-300',
    backgroundClassName: 'from-violet-500/25 via-purple-400/10 to-violet-600/20'
  },
  '/curriculum': {
    icon: BookOpen,
    iconClassName: 'text-amber-300',
    backgroundClassName: 'from-amber-500/25 via-yellow-400/10 to-amber-600/20'
  },
  '/messages': {
    icon: MessageSquare,
    iconClassName: 'text-fuchsia-300',
    backgroundClassName: 'from-fuchsia-500/25 via-pink-400/10 to-fuchsia-600/20'
  },
  '/audit': {
    icon: ShieldCheck,
    iconClassName: 'text-teal-300',
    backgroundClassName: 'from-teal-500/25 via-emerald-400/10 to-teal-600/20'
  },
  '/roles': {
    icon: ShieldCheck,
    iconClassName: 'text-red-300',
    backgroundClassName: 'from-red-500/25 via-rose-400/10 to-red-600/20'
  },
  '/timetable': {
    icon: CalendarDays,
    iconClassName: 'text-sky-300',
    backgroundClassName: 'from-sky-500/25 via-blue-400/10 to-sky-600/20'
  },
  '/payroll': {
    icon: AfghaniIcon,
    iconClassName: 'text-amber-300',
    backgroundClassName: 'from-amber-500/25 via-orange-400/10 to-amber-600/20'
  },
  '/academy-financial-report': {
    icon: AfghaniIcon,
    iconClassName: 'text-blue-300',
    backgroundClassName: 'from-blue-500/25 via-indigo-400/10 to-blue-600/20'
  }
};

export function getEntityIconStyle(entityPath: string): EntityIconStyle {
  return ENTITY_ICON_STYLES[entityPath] ?? DEFAULT_ICON_STYLE;
}

export function getCatalogIconStyle(catalogType: 'class' | 'course'): EntityIconStyle {
  return catalogType === 'class' ? ENTITY_ICON_STYLES['/classes'] : ENTITY_ICON_STYLES['/courses'];
}
