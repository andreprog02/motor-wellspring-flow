import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import {
  Gauge,
  Wrench,
  ClipboardList,
  Boxes,
  ShieldCheck,
  BarChart3,
  Cog,
  Fuel,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import heroImage from '@/assets/landing-hero.jpg';

const features = [
  {
    icon: Gauge,
    title: 'Monitoramento de Ativos',
    desc: 'Acompanhe geradores, motores e equipamentos com horímetro, partidas e status em tempo real.',
  },
  {
    icon: ClipboardList,
    title: 'Planos de Manutenção',
    desc: 'Planos preventivos hierárquicos por componente, com alertas automáticos de vencimento.',
  },
  {
    icon: Cog,
    title: 'Cabeçotes & Turbos',
    desc: 'Gestão completa de cabeçotes, turbos e componentes por cilindro com histórico detalhado.',
  },
  {
    icon: Fuel,
    title: 'Óleo & Filtros',
    desc: 'Controle de trocas de óleo, filtros de ar e combustível com baselines de uso.',
  },
  {
    icon: Boxes,
    title: 'Estoque & Ferramentas',
    desc: 'Inventário de peças e ferramentas integrado, com exportação para Excel e PDF.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Completos',
    desc: 'Relatórios de serviços realizados com filtros avançados e exportação flexível.',
  },
];

const statuses = [
  { label: 'Em dia', cls: 'status-ok', dot: 'status-dot-ok' },
  { label: 'Atenção', cls: 'status-warning', dot: 'status-dot-warning' },
  { label: 'Vencido', cls: 'status-critical', dot: 'status-dot-critical' },
];

const benefits = [
  'Acesso seguro e isolado por empresa (multi-tenant)',
  'Histórico completo de cada serviço realizado',
  'Alertas inteligentes de manutenção preventiva',
  'Multi-idioma: Português, Inglês e Espanhol',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Hub Engine</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#status" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#cta" className="hover:text-foreground transition-colors">Começar</a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSelector compact />
            <Button asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Sala de geradores industriais de energia"
            width={1536}
            height={1024}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-40">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground mb-6">
              <span className="status-dot-ok" /> Gestão industrial inteligente
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary-foreground leading-tight">
              Manutenção de geradores sem surpresas
            </h1>
            <p className="mt-6 text-lg text-primary-foreground/80 max-w-xl">
              O Hub Engine centraliza o controle de manutenção dos seus motores, geradores e
              componentes. Previna falhas, organize o estoque e tenha relatórios completos em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" variant="secondary">
                <Link to="/login">
                  Acessar plataforma <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <a href="#features">Conhecer recursos</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tudo que sua operação precisa</h2>
          <p className="mt-4 text-muted-foreground">
            Da partida do motor ao relatório final — uma plataforma completa para equipes de manutenção.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-industrial/40"
            >
              <div className="h-11 w-11 rounded-lg bg-industrial-muted flex items-center justify-center mb-4 transition-colors group-hover:bg-industrial group-hover:text-industrial-foreground text-industrial">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Status / how it works */}
      <section id="status" className="bg-secondary/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Saiba o estado de cada equipamento num piscar de olhos
            </h2>
            <p className="mt-4 text-muted-foreground">
              Indicadores semânticos mostram exatamente quais ativos precisam de atenção,
              priorizando o que é urgente antes que vire um problema.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {statuses.map((s) => (
                <div
                  key={s.label}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${s.cls}`}
                >
                  <span className={s.dot} /> {s.label}
                </div>
              ))}
            </div>
            <ul className="mt-8 space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-status-ok shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Gauge, label: 'Ativos monitorados' },
              { icon: Wrench, label: 'Manutenções' },
              { icon: Cog, label: 'Componentes' },
              { icon: ClipboardList, label: 'Planos preventivos' },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <c.icon className="h-7 w-7 text-primary" />
                <p className="mt-4 text-sm font-medium">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 md:px-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary-foreground">
            Pronto para organizar sua manutenção?
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Acesse o Hub Engine e mantenha seus geradores funcionando com confiança e previsibilidade.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" variant="secondary">
              <Link to="/login">
                Entrar na plataforma <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Hub Engine</span>
          </div>
          <p>© {new Date().getFullYear()} Hub Engine. Todos os direitos reservados.</p>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Termos de Uso
          </Link>
        </div>
      </footer>
    </div>
  );
}
