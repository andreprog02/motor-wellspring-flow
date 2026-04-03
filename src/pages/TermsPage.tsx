import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function TermsPage() {
  const lastUpdated = '03 de abril de 2026';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-6 md:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Termos de Uso e Política de Privacidade</h1>
              <p className="text-sm text-muted-foreground">Última atualização: {lastUpdated}</p>
            </div>
          </div>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. O que é o Hub Engine</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O Hub Engine é uma plataforma de gestão de manutenção de equipamentos industriais, como geradores, motores e seus componentes. O sistema permite registrar equipamentos, planejar e acompanhar manutenções preventivas e corretivas, gerenciar estoque de peças e gerar relatórios operacionais.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Dados coletados</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para o funcionamento do sistema, coletamos e armazenamos os seguintes dados:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
              <li><strong className="text-foreground">Dados de cadastro:</strong> nome completo e endereço de e-mail.</li>
              <li><strong className="text-foreground">Dados de autenticação:</strong> senha (armazenada de forma criptografada).</li>
              <li><strong className="text-foreground">Dados operacionais:</strong> informações sobre equipamentos, manutenções, peças de estoque e relatórios registrados pelo usuário.</li>
              <li><strong className="text-foreground">Dados de acesso:</strong> data e hora do último login.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Uso dos dados</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Os dados coletados são utilizados exclusivamente para:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
              <li>Permitir o acesso e uso da plataforma.</li>
              <li>Exibir e organizar os registros de manutenção e equipamentos.</li>
              <li>Gerar relatórios solicitados pelo próprio usuário.</li>
              <li>Garantir a segurança da conta do usuário.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Compartilhamento de dados</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Não compartilhamos, vendemos ou alugamos seus dados pessoais com terceiros.</strong> Os dados ficam restritos à sua conta e à organização (tenant) à qual você pertence dentro do sistema.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Armazenamento e segurança</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Os dados são armazenados em servidores seguros com criptografia em trânsito e em repouso. Utilizamos práticas de segurança como autenticação por token, políticas de acesso por linha (RLS) e isolamento de dados entre organizações.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Seus direitos (LGPD)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 pl-2">
              <li>Acessar os dados pessoais que mantemos sobre você.</li>
              <li>Solicitar a correção de dados incompletos ou incorretos.</li>
              <li>Solicitar a exclusão dos seus dados pessoais.</li>
              <li>Revogar o consentimento para o uso dos seus dados a qualquer momento.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para exercer qualquer um desses direitos, entre em contato com o administrador do sistema.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Alterações nestes termos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Podemos atualizar estes termos periodicamente. Quando isso acontecer, a data de "última atualização" no topo desta página será modificada. Recomendamos que você revise esta página ocasionalmente.
            </p>
          </section>

          <Separator />

          <p className="text-xs text-muted-foreground text-center">
            Ao criar uma conta ou utilizar o Hub Engine, você declara que leu e concorda com estes termos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
