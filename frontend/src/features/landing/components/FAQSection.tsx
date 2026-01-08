import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Minus, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'O que é o Clona Gram?',
    answer: 'Clona Gram é uma ferramenta profissional que permite copiar mensagens entre canais do Telegram de forma automática e eficiente. Com ela, você pode fazer cópia histórica de mensagens existentes ou monitorar e copiar novas mensagens em tempo real.',
  },
  {
    question: 'Preciso fornecer minhas credenciais do Telegram?',
    answer: 'Sim, você precisa de API ID e API Hash do Telegram, que você obtém gratuitamente no site my.telegram.org. Suas credenciais ficam seguras em nossos servidores criptografados e são usadas apenas para autenticar sua conta.',
  },
  {
    question: 'Posso copiar mensagens em tempo real?',
    answer: 'Sim! Os planos Premium e Enterprise permitem cópia em tempo real, onde novas mensagens são automaticamente copiadas assim que chegam no canal de origem. É perfeito para manter canais sincronizados.',
  },
  {
    question: 'Qual é o limite de mensagens no plano gratuito?',
    answer: 'O plano gratuito permite copiar até 1.000 mensagens por dia e criar até 3 jobs históricos. Para limites maiores ou ilimitados, considere nossos planos Premium ou Enterprise.',
  },
  {
    question: 'Como funciona a cópia histórica?',
    answer: 'A cópia histórica permite que você copie todas as mensagens existentes de um canal. Você pode escolher copiar todo o histórico disponível, e o sistema processará as mensagens automaticamente mantendo mídia e formatação.',
  },
  {
    question: 'Posso cancelar minha assinatura a qualquer momento?',
    answer: 'Sim! Você pode cancelar sua assinatura a qualquer momento diretamente pelo dashboard. Após o cancelamento, você continuará tendo acesso até o final do período pago.',
  },
];

function FAQItem({ faq, isOpen, onClick, index }: {
  faq: FAQ;
  isOpen: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'bg-card/80 backdrop-blur-sm border rounded-xl overflow-hidden transition-all duration-300',
        isOpen ? 'border-primary/50 shadow-lg' : 'border-border/50 hover:border-primary/30'
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full px-6 py-5 flex items-center justify-between text-left transition-colors',
          'hover:bg-muted/30'
        )}
      >
        <span className="font-semibold pr-4 text-foreground">{faq.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
            isOpen ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-6 pb-5 text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      <div className="container mx-auto px-4 max-w-3xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-sm font-medium text-primary bg-primary/10 rounded-full"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Dúvidas Frequentes</span>
          </motion.div>

          <h2 className="heading-2 mb-4">
            Perguntas <span className="text-gradient">Frequentes</span>
          </h2>

          <p className="body-large text-muted-foreground max-w-2xl mx-auto">
            Tire suas dúvidas sobre o Clona Gram e descubra
            como podemos ajudar você.
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onClick={() => toggleFAQ(index)}
              index={index}
            />
          ))}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground">
            Ainda tem dúvidas?{' '}
            <a
              href="mailto:suporte@clonagram.com"
              className="text-primary font-medium hover:underline"
            >
              Entre em contato conosco
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
