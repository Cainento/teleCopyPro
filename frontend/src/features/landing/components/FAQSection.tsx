import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'O que é o TeleCopy Pro?',
    answer: 'TeleCopy Pro é uma ferramenta profissional que permite copiar mensagens entre canais do Telegram de forma automática e eficiente.',
  },
  {
    question: 'Preciso fornecer minhas credenciais do Telegram?',
    answer: 'Sim, você precisa de API ID e API Hash do Telegram, que você obtém gratuitamente no site my.telegram.org. Suas credenciais ficam seguras e são usadas apenas para autenticar sua conta.',
  },
  {
    question: 'Posso copiar mensagens em tempo real?',
    answer: 'Sim! O plano Premium permite cópia em tempo real, onde novas mensagens são automaticamente copiadas assim que chegam no canal de origem.',
  },
  {
    question: 'Qual é o limite de mensagens no plano gratuito?',
    answer: 'O plano gratuito permite copiar até 100 mensagens. Para mensagens ilimitadas, considere nosso plano Premium.',
  },
  {
    question: 'Como funciona a cópia histórica?',
    answer: 'A cópia histórica permite que você copie todas as mensagens existentes de um canal. Você pode escolher um período específico ou copiar todo o histórico disponível.',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            Tire suas dúvidas sobre o TeleCopy Pro
          </p>
        </motion.div>

        <motion.div
          className="space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="bg-card border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
              >
                <span className="font-semibold pr-4">{faq.question}</span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 text-muted-foreground transition-transform flex-shrink-0',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-4 text-muted-foreground">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
