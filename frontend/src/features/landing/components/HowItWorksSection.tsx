import { motion } from 'framer-motion';
import { UserPlus, Settings, Play, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function HowItWorksSection() {
    const steps = [
        {
            id: 1,
            title: 'Crie sua Conta',
            description: 'Cadastre-se em segundos e configure seu perfil no Clona Gram.',
            icon: UserPlus,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            id: 2,
            title: 'Configure os Canais',
            description: 'Defina o canal de origem (que você quer copiar) e o de destino.',
            icon: Settings,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
        },
        {
            id: 3,
            title: 'Inicie a Cópia',
            description: 'O sistema começa a trabalhar instantaneamente em tempo real.',
            icon: Play,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
        },
    ];

    return (
        <section id="how-it-works" className="py-24 relative overflow-hidden bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-primary" />
                        Simples e Rápido
                    </motion.div>

                    <h2 className="text-3xl md:text-5xl font-bold mb-4">
                        Como funciona o <span className="text-gradient">Clona Gram</span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Configure sua automação em 3 passos simples e comece a escalar seus canais.
                    </p>
                </div>

                <div className="relative">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0" />

                    <div className="grid md:grid-cols-3 gap-8 relative z-10">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.2 }}
                                    className="relative group"
                                >
                                    <div className="card-hover bg-background border border-border/50 rounded-2xl p-8 relative h-full flex flex-col items-center text-center">
                                        {/* Step Number Badge */}
                                        <div className="absolute -top-4 bg-background border border-border shadow-sm px-3 py-1 rounded-full text-sm font-bold text-muted-foreground">
                                            Passo 0{step.id}
                                        </div>

                                        <div className={cn(
                                            "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300",
                                            step.bgColor
                                        )}>
                                            <Icon className={cn("w-8 h-8", step.color)} />
                                        </div>

                                        <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                        <p className="text-muted-foreground leading-relaxed mb-6">
                                            {step.description}
                                        </p>

                                        <div className="mt-auto pt-6 border-t w-full border-border/30">
                                            <CheckCircle2 className={cn("w-5 h-5 mx-auto opacity-50", step.color)} />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
